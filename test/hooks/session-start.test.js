'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject } = require('../helpers')

const sessionStart = (root) => runHook('session-start.js', { hook_event_name: 'SessionStart', source: 'startup', cwd: root })

describe('session-start', () => {
  it('gives the active cycle as context: mode, phase, tests, remaining items and the rules of the phase', () => {
    const root = aTddProject({ phase: 'GREEN', mode: 'outside-in',
      state: { currentTest: 'an order worth 60 has no fees', acceptanceTest: 'test/acceptance/shipping.test.ts' },
      files: { '.tdd/test-list.md': '- [ ] Scenario: free shipping\n  - [x] a\n  - [ ] an order worth 60 has no fees\n  - [ ] b\n' } })

    const result = sessionStart(root)

    assert.equal(result.code, 0)
    const { hookSpecificOutput } = JSON.parse(result.stdout)
    assert.equal(hookSpecificOutput.hookEventName, 'SessionStart')
    const context = hookSpecificOutput.additionalContext
    for (const expected of [/outside-in/, /Phase: GREEN/, /Acceptance test: test\/acceptance\/shipping\.test\.ts/,
      /Current test: an order worth 60 has no fees/, /Remaining: Scenario: free shipping; an order worth 60 has no fees; b/,
      /read-only/]) {
      assert.match(context, expected)
    }
  })

  it('says nothing when TDD is OFF', () => {
    assert.equal(sessionStart(aTddProject({ phase: 'OFF' })).stdout, '')
  })
})
