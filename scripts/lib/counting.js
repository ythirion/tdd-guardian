'use strict'

// A test is counted once at its declaration. Property runners (fc.assert, @given)
// are not counted on their own: a property is one test, whatever the number of runs.
const TEST_DECLARATIONS = [
  '(?<![\\w.$])(?:it|test)(?:\\.only)?\\s*\\(', // Jest, Vitest, Mocha, node:test
  '@(?:Test|ParameterizedTest|Property)\\b', // JUnit, jqwik
  '\\[(?:Fact|Theory|Property|Test|TestCase|TestMethod)\\b', // xUnit, FsCheck, NUnit, MSTest
  '^\\s*(?:async\\s+)?def\\s+test_', // pytest, unittest
]

const DISABLING_MARKERS = [
  '\\b(?:it|test|describe|context)\\.(?:skip|todo)\\s*\\(',
  '(?<![\\w.$])x(?:it|test|describe|context)\\s*\\(',
  '@(?:Disabled|Ignore)\\b',
  '\\bpytest\\.mark\\.(?:skip|skipif|xfail)\\b',
  '\\bunittest\\.skip\\w*',
  '\\[Ignore\\b',
  '\\[(?:Fact|Theory|Property)\\s*\\([^\\]]*\\bSkip\\s*=',
]

function findDisablingMarkers(content) {
  return DISABLING_MARKERS.flatMap((source) => content.match(new RegExp(source, 'gm')) || [])
}

const BUILT_IN_ASSERTIONS = [
  '\\bexpect\\s*\\(', // Jest, Vitest, Chai
  '\\bassert\\w*\\s*[(.]', // node:assert, JUnit, AssertJ
  '^\\s*assert\\s', // Python
  '\\bAssert\\.\\w+\\s*\\(', // xUnit, NUnit, MSTest
  '\\bCheck\\.That\\w*\\s*\\(', // NFluent
  '\\.Should\\(\\)', // FluentAssertions
]

// Domain-language names carry accents (AÉmisLÉvénement): \w is widened to Unicode letters.
const unicodeWords = (source) => source.replace(/(?<!\\)\\w/g, '[\\p{L}\\p{N}_]')

// Each match counts once, even when several patterns hit the same call.
function countAssertions(content, assertionMethodPatterns = []) {
  const positions = new Set()
  const sources = [...BUILT_IN_ASSERTIONS.map((s) => [s, 'gm']), ...assertionMethodPatterns.map((s) => [unicodeWords(s), 'gimu'])]
  for (const [source, flags] of sources) {
    for (const match of content.matchAll(new RegExp(source, flags))) positions.add(match.index)
  }
  return positions.size
}

function countMatches(content, sources) {
  return sources.reduce((total, source) => total + (content.match(new RegExp(source, 'gm')) || []).length, 0)
}

const countTests = (content, declarations = TEST_DECLARATIONS) => countMatches(content, declarations)

module.exports = { countTests, countMatches, findDisablingMarkers, countAssertions, TEST_DECLARATIONS }
