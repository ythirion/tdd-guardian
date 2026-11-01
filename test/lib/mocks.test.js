'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { findNewMocks } = require('../../scripts/lib/mocks')

const jest = ['jest\\.fn\\(', 'jest\\.mock\\(']

describe('Mock detection', () => {
  it('reports the mocking-library calls on lines that are new, not the existing ones', () => {
    const before = `const notify = jest.fn()\nit('a', () => {})`
    const after = `const notify = jest.fn()\nit('a', () => {})\nconst save = jest.fn()\nconst clock = () => NOW`

    const mocks = findNewMocks(before, after, jest)

    assert.deepEqual(mocks.map(({ line, text }) => ({ line, text })), [{ line: 3, text: 'const save = jest.fn()' }])
  })
  it('accepts a mock justified on the same or the previous line, and keeps the reason', () => {
    const after = [
      'const sdk = jest.fn() // tdd-guard: allow-mock third-party SDK with no port',
      '// tdd-guard: allow-mock legacy mailer, no seam yet',
      'jest.mock("../legacy/mailer")',
    ].join('\n')

    const mocks = findNewMocks('', after, jest)

    assert.deepEqual(mocks.map(({ line, reason }) => ({ line, reason })), [
      { line: 1, reason: 'third-party SDK with no port' },
      { line: 3, reason: 'legacy mailer, no seam yet' },
    ])
  })
  it('does not accept the marker without a reason', () => {
    const [mock] = findNewMocks('', 'const save = jest.fn() // tdd-guard: allow-mock', jest)

    assert.equal(mock.justified, false)
  })
})
