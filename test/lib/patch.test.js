'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { parsePatch, applyHunks } = require('../../scripts/lib/patch')

// The format GitHub Copilot CLI sends as tool_input of its Edit tool (captured from Copilot CLI 1.0.105).
describe('apply_patch payloads (GitHub Copilot)', () => {
  it('reads an added file and its content', () => {
    const [change] = parsePatch('*** Begin Patch\n*** Add File: src/luhn.txt\n+one\n+two\n*** End Patch\n')

    assert.deepEqual(change, { op: 'add', path: 'src/luhn.txt', content: 'one\ntwo\n' })
  })
  it('reads an updated file as hunks, and applies them to the current content', () => {
    const [change] = parsePatch('*** Begin Patch\n*** Update File: src/luhn.txt\n@@\n-one\n+two\n*** End Patch\n')

    assert.equal(change.op, 'update')
    assert.equal(change.path, 'src/luhn.txt')
    assert.equal(applyHunks('zero\none\nthree\n', change.hunks), 'zero\ntwo\nthree\n')
  })
  it('uses the context lines to place a hunk, and keeps them', () => {
    const [change] = parsePatch([
      '*** Begin Patch', '*** Update File: src/a.test.ts', '@@ describe', " it('a', () => {})", "+it('b', () => {})", '*** End Patch',
    ].join('\n'))

    assert.equal(applyHunks("describe\nit('a', () => {})\nend\n", change.hunks), "describe\nit('a', () => {})\nit('b', () => {})\nend\n")
  })
  it('reads several files, a deletion and a move in one patch', () => {
    const changes = parsePatch([
      '*** Begin Patch',
      '*** Add File: src/a.ts', '+a',
      '*** Delete File: src/old.ts',
      '*** Update File: src/b.ts', '*** Move to: src/c.ts', '@@', '-b', '+c',
      '*** End Patch',
    ].join('\n'))

    assert.deepEqual(changes.map(({ op, path, moveTo }) => ({ op, path, moveTo })), [
      { op: 'add', path: 'src/a.ts', moveTo: undefined },
      { op: 'delete', path: 'src/old.ts', moveTo: undefined },
      { op: 'update', path: 'src/b.ts', moveTo: 'src/c.ts' },
    ])
  })
  it('appends the added lines when a hunk cannot be placed, so new tests are still counted', () => {
    const [change] = parsePatch("*** Begin Patch\n*** Update File: a.test.ts\n@@\n-not there\n+it('b', () => {})\n*** End Patch")

    assert.match(applyHunks("it('a', () => {})\n", change.hunks), /it\('b'/)
  })
  it('returns nothing for a text that is not a patch', () => {
    assert.deepEqual(parsePatch('hello'), [])
  })
})
