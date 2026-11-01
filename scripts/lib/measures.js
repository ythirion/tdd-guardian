'use strict'
const { filesOfKind, read } = require('./files')
const { countTests, countAssertions } = require('./counting')

// What the exit conditions compare: tests per kind, assertions over all test code.
function testCount(root, config, kind) {
  return filesOfKind(root, config, [kind]).reduce((sum, file) => sum + countTests(read(root, file)), 0)
}

function assertionCount(root, config) {
  return filesOfKind(root, config, ['test', 'acceptance'])
    .reduce((sum, file) => sum + countAssertions(read(root, file), config.assertionMethodPatterns), 0)
}

module.exports = { testCount, assertionCount }
