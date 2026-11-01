'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { DEFAULT_CONFIG } = require('../../scripts/lib/config')
const { classify } = require('../../scripts/lib/classify')

const config = {
  ...DEFAULT_CONFIG,
  testFilePatterns: ['**/*.test.ts', 'test/**'],
  acceptanceTestPatterns: ['test/acceptance/**'],
  fakePatterns: ['test/fakes/**'],
  testSupportPatterns: ['test/builders/**', 'test/assertions/**'],
  sourceFilePatterns: ['src/**'],
  freeFilePatterns: ['*.md', '.tdd/test-list.md', 'docs/**'],
}
const kindOf = (file, root = '/project') => classify(file, root, config)

describe('File classification', () => {
  it('sees an acceptance test even though it also matches the unit test patterns', () => {
    assert.equal(kindOf('test/acceptance/shipping.test.ts'), 'acceptance')
  })
  it('puts unit tests, Fakes and test support (builders, assertions) in the same test-code family', () => {
    assert.equal(kindOf('src/foo.test.ts'), 'test')
    assert.equal(kindOf('test/fakes/in-memory-orders.ts'), 'test')
    assert.equal(kindOf('test/builders/order-builder.ts'), 'test')
    assert.equal(kindOf('test/assertions/order-assertions.ts'), 'test')
  })
  it('sees README.md and docs as free files, and the test list as its own kind', () => {
    assert.equal(kindOf('README.md'), 'free')
    assert.equal(kindOf('docs/adr/0001.md'), 'free')
    assert.equal(kindOf('.tdd/test-list.md'), 'test-list')
  })
  it('protects the plugin state and config: every .tdd/ file except the test list', () => {
    assert.equal(kindOf('.tdd/state.json'), 'guard')
    assert.equal(kindOf('.tdd/config.json'), 'guard')
    assert.equal(kindOf('.tdd/notes.md'), 'guard')
  })
  it('treats a file matching no pattern as production code', () => {
    assert.equal(kindOf('src/shipping.ts'), 'production')
    assert.equal(kindOf('lib/legacy.js'), 'production')
  })

  it('classifies absolute and Windows paths relative to the project root', () => {
    assert.equal(kindOf('/project/src/foo.test.ts'), 'test')
    assert.equal(kindOf('C:\\work\\shop\\test\\fakes\\orders.ts', 'C:\\work\\shop'), 'test')
    assert.equal(kindOf('/project/.tdd/state.json'), 'guard')
  })
})
