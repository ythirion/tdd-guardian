'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { matchesAny } = require('../../scripts/lib/glob')

describe('Glob patterns', () => {
  it('matches like a .gitignore glob: ** crosses folders, a bare name matches at any depth', () => {
    assert.equal(matchesAny('src/foo.test.ts', ['**/*.test.ts']), true)
    assert.equal(matchesAny('foo.test.ts', ['**/*.test.ts']), true)
    assert.equal(matchesAny('src/foo.ts', ['**/*.test.ts']), false)
    assert.equal(matchesAny('test/fakes/deep/orders.ts', ['test/**']), true)
    assert.equal(matchesAny('src/test/x.ts', ['test/**']), false)
    assert.equal(matchesAny('docs/guide/README.md', ['*.md']), true)
    assert.equal(matchesAny('.tdd/test-list.md', ['.tdd/test-list.md']), true)
  })
})
