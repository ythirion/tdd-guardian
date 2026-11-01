'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, RED_SUITE, GREEN_SUITE } = require('../helpers')

// A Stop hook blocks with {"decision":"block","reason"} on stdout and exit 0: the one form both
// Claude Code and GitHub Copilot read (Copilot ignores exit 2 on Stop).
const stop = (root, extra = {}) => {
  const result = runHook('check-stop.js', { hook_event_name: 'Stop', cwd: root, stop_hook_active: false, ...extra })
  assert.equal(result.code, 0, result.stderr)
  const decision = result.stdout.trim() ? JSON.parse(result.stdout) : {}
  return { ...result, blocked: decision.decision === 'block', reason: decision.reason || '' }
}

describe('check-stop', () => {
  it('blocks stopping in GREEN while the unit suite is red', () => {
    const root = aTddProject({ phase: 'GREEN', config: { testCommand: RED_SUITE } })

    const result = stop(root)

    assert.ok(result.blocked)
    assert.match(result.reason, /unit suite must be green before handing back/)
  })
  it('lets it stop with a warning when stop_hook_active is set, to avoid an endless loop', () => {
    const root = aTddProject({ phase: 'GREEN', config: { testCommand: RED_SUITE } })

    const result = stop(root, { stop_hook_active: true })

    assert.ok(!result.blocked)
    assert.match(result.stderr, /warning/)
  })

  it('blocks stopping in REFACTOR while the unit suite is red', () => {
    assert.ok(stop(aTddProject({ phase: 'REFACTOR', config: { testCommand: RED_SUITE } })).blocked)
  })
  it('blocks stopping in RED with no new failing test, with a reminder', () => {
    const noNewTest = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 0 }, config: { testCommand: RED_SUITE } })
    const newButPassing = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 0 }, config: { testCommand: GREEN_SUITE },
      files: { 'src/a.test.ts': "it('a', () => {})" } })

    const result = stop(noNewTest)

    assert.ok(result.blocked)
    assert.match(result.reason, /RED.*new failing test/)
    assert.ok(stop(newButPassing).blocked)
  })

  it('lets it stop in OFF, LIST, with a green suite, or with the new test failing in RED', () => {
    const redWithTheTest = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 0 }, config: { testCommand: RED_SUITE },
      files: { 'src/a.test.ts': "it('a', () => {})" } })

    assert.ok(!stop(aTddProject({ phase: 'OFF', config: { testCommand: RED_SUITE } })).blocked)
    assert.ok(!stop(aTddProject({ phase: 'LIST' })).blocked)
    assert.ok(!stop(aTddProject({ phase: 'GREEN', config: { testCommand: GREEN_SUITE } })).blocked)
    assert.ok(!stop(redWithTheTest).blocked)
  })
})
