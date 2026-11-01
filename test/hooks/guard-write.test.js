'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, aWrite, anEdit } = require('../helpers')

const guardWrite = (payload) => runHook('guard-write.js', payload)
const ALLOWED = 0
const BLOCKED = 2

describe('guard-write: writes allowed per phase', () => {
  it('lets every file through in OFF', () => {
    const root = aTddProject({ phase: 'OFF' })

    for (const file of ['src/foo.ts', 'src/foo.test.ts', 'test/acceptance/shipping.test.ts']) {
      assert.equal(guardWrite(aWrite(root, file, 'x')).code, ALLOWED, file)
    }
  })
  it('blocks the plugin state in every phase, and says to go through tdd.js', () => {
    for (const phase of ['OFF', 'LIST', 'ACCEPTANCE', 'RED', 'GREEN', 'REFACTOR']) {
      const result = guardWrite(aWrite(aTddProject({ phase }), '.tdd/state.json', '{"phase":"OFF"}'))

      assert.equal(result.code, BLOCKED, phase)
      assert.match(result.stderr, /tdd\.js/)
    }
  })
  it('blocks an Edit on a unit test in GREEN, quoting the rule, the reason and the expected action', () => {
    const root = aTddProject({ phase: 'GREEN', files: { 'src/foo.test.ts': "it('a', () => expect(1).toBe(2))" } })

    const result = guardWrite(anEdit(root, 'src/foo.test.ts', 'toBe(2)', 'toBe(1)'))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /GREEN.*tests are read-only/)
    assert.match(result.stderr, /Why: /)
    assert.match(result.stderr, /Do instead: .*production code/)
  })
})
