'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { aProject } = require('../helpers')
const { runSuite } = require('../../scripts/lib/runner')

describe('Running a suite', () => {
  it('is green on exit code 0, red otherwise, and keeps the tail of the output', () => {
    const root = aProject()

    assert.equal(runSuite('node -e "process.exit(0)"', root).green, true)
    const red = runSuite('node -e "console.log(\'expected 5, got 0\'); process.exit(3)"', root)
    assert.equal(red.green, false)
    assert.match(red.output, /expected 5, got 0/)
  })
})
