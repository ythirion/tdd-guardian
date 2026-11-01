'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { runHook, aTddProject, toolCall } = require('../helpers')

const asAgent = (agent_type, payload) => ({ ...payload, ...(agent_type ? { agent_type, agent_id: 'a1' } : {}) })

describe('guard-read', () => {
  it('keeps the test list away from tdd-implementer, so it cannot anticipate the next cases', () => {
    const root = aTddProject({ phase: 'GREEN', files: { '.tdd/test-list.md': '- [ ] a\n' } })
    const readList = toolCall(root, 'Read', { file_path: path.join(root, '.tdd/test-list.md') })
    const grepList = toolCall(root, 'Grep', { pattern: 'x', path: path.join(root, '.tdd') })
    const catList = toolCall(root, 'Bash', { command: 'cat .tdd/test-list.md' })

    const blocked = runHook('guard-read.js', asAgent('tdd:tdd-implementer', readList))

    assert.equal(blocked.code, 2)
    assert.match(blocked.stderr, /tdd-implementer/)
    assert.equal(runHook('guard-read.js', asAgent('tdd-implementer', grepList)).code, 2)
    assert.equal(runHook('guard-read.js', asAgent('tdd:tdd-implementer', catList)).code, 2)
    assert.equal(runHook('guard-read.js', asAgent('tdd:tdd-tester', readList)).code, 0)
    assert.equal(runHook('guard-read.js', asAgent(null, readList)).code, 0)
  })
})
