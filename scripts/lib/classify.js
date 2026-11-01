'use strict'
const { matchesAny } = require('./glob')

const TEST_LIST = '.tdd/test-list.md'

const toPosix = (p) => String(p).replace(/\\/g, '/')

// Project-relative, forward slashes, so globs behave the same on every OS.
function relativeTo(root, file) {
  const posixFile = toPosix(file)
  const posixRoot = toPosix(root).replace(/\/+$/, '')
  const sameCase = /^[a-z]:/i.test(posixRoot) ? (s) => s.toLowerCase() : (s) => s
  if (sameCase(posixFile).startsWith(sameCase(posixRoot) + '/')) return posixFile.slice(posixRoot.length + 1)
  return posixFile.replace(/^\.\//, '')
}

function classify(file, root, config) {
  const rel = relativeTo(root, file)
  if (rel === TEST_LIST) return 'test-list'
  if (rel.startsWith('.tdd/')) return 'guard'
  if (matchesAny(rel, config.freeFilePatterns)) return 'free'
  if (matchesAny(rel, config.acceptanceTestPatterns)) return 'acceptance'
  if (matchesAny(rel, [...config.testFilePatterns, ...config.fakePatterns, ...config.testSupportPatterns])) return 'test'
  return 'production'
}

module.exports = { classify, relativeTo, TEST_LIST }
