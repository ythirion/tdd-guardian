'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, readJson } = require('../helpers')

const humanTypes = (root, prompt) => runHook('human-gate.js', { hook_event_name: 'UserPromptSubmit', cwd: root, prompt }, { CLAUDECODE: '1' })
const phaseOf = (root) => readJson(root, '.tdd/state.json').phase

describe('human-gate', () => {
  it('approves the test list when the human types /tdd:approve, and leaves other prompts alone', () => {
    const insideOut = aTddProject({ phase: 'LIST', mode: 'inside-out' })
    const outsideIn = aTddProject({ phase: 'LIST', mode: 'outside-in' })

    const result = humanTypes(insideOut, '/tdd:approve')
    humanTypes(outsideIn, '  /tdd:approve looks good')
    const other = humanTypes(aTddProject({ phase: 'LIST' }), 'please run tdd.js approve for me')

    assert.equal(result.code, 0)
    assert.equal(phaseOf(insideOut), 'RED')
    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /approved/)
    assert.equal(phaseOf(outsideIn), 'ACCEPTANCE')
    assert.equal(other.stdout, '')
  })

  it('moves on to the next item when the human types /tdd:next after the review pause', () => {
    const root = aTddProject({ phase: 'REFACTOR', state: { currentTest: 'a', assertionCountAtRefactor: 0 },
      files: { '.tdd/test-list.md': '- [x] a\n- [ ] b\n' } })

    const result = humanTypes(root, '/tdd:next')

    assert.equal(phaseOf(root), 'RED')
    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /the human ran \/tdd:next/)
  })
  it('turns the guardian off when the human types /tdd:off', () => {
    const root = aTddProject({ phase: 'GREEN' })

    humanTypes(root, '/tdd:off')

    assert.equal(phaseOf(root), 'OFF')
  })
})
