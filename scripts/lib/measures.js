'use strict'
const { filesOfKind, read } = require('./files')
const { countTests, countAssertions } = require('./counting')

// What the exit conditions compare: tests per kind, assertions over all test code.
function testCountsByFile(root, config, kind) {
  return Object.fromEntries(filesOfKind(root, config, [kind]).map((file) => [file, countTests(read(root, file))]))
}

function testCount(root, config, kind) {
  return Object.values(testCountsByFile(root, config, kind)).reduce((sum, n) => sum + n, 0)
}

// Files whose test count grew since a snapshot.
function filesWithNewTests(root, config, kind, snapshot = {}) {
  return Object.entries(testCountsByFile(root, config, kind))
    .filter(([file, n]) => n > (snapshot[file] || 0))
    .map(([file]) => file)
}

function assertionCount(root, config) {
  return filesOfKind(root, config, ['test', 'acceptance'])
    .reduce((sum, file) => sum + countAssertions(read(root, file), config.assertionMethodPatterns), 0)
}

module.exports = { testCount, testCountsByFile, filesWithNewTests, assertionCount }
