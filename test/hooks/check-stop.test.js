'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, RED_SUITE, GREEN_SUITE } = require('../helpers')

const ALLOWED = 0
const BLOCKED = 2
const stop = (root, extra = {}) => runHook('check-stop.js', { hook_event_name: 'Stop', cwd: root, stop_hook_active: false, ...extra })

describe('check-stop', () => {
  it('blocks stopping in GREEN while the unit suite is red', () => {
    const root = aTddProject({ phase: 'GREEN', config: { testCommand: RED_SUITE } })

    const result = stop(root)

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /unit suite must be green before handing back/)
  })
  it('lets it stop with a warning when stop_hook_active is set, to avoid an endless loop', () => {
    const root = aTddProject({ phase: 'GREEN', config: { testCommand: RED_SUITE } })

    const result = stop(root, { stop_hook_active: true })

    assert.equal(result.code, ALLOWED)
    assert.match(result.stderr, /warning/)
  })

  it('blocks stopping in REFACTOR while the unit suite is red', () => {
    assert.equal(stop(aTddProject({ phase: 'REFACTOR', config: { testCommand: RED_SUITE } })).code, BLOCKED)
  })
  it('blocks stopping in RED with no new failing test, with a reminder', () => {
    const noNewTest = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 0 }, config: { testCommand: RED_SUITE } })
    const newButPassing = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 0 }, config: { testCommand: GREEN_SUITE },
      files: { 'src/a.test.ts': "it('a', () => {})" } })

    const result = stop(noNewTest)

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /RED.*new failing test/)
    assert.equal(stop(newButPassing).code, BLOCKED)
  })

  it('lets it stop in OFF, LIST, with a green suite, or with the new test failing in RED', () => {
    const redWithTheTest = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 0 }, config: { testCommand: RED_SUITE },
      files: { 'src/a.test.ts': "it('a', () => {})" } })

    assert.equal(stop(aTddProject({ phase: 'OFF', config: { testCommand: RED_SUITE } })).code, ALLOWED)
    assert.equal(stop(aTddProject({ phase: 'LIST' })).code, ALLOWED)
    assert.equal(stop(aTddProject({ phase: 'GREEN', config: { testCommand: GREEN_SUITE } })).code, ALLOWED)
    assert.equal(stop(redWithTheTest).code, ALLOWED)
  })
})
