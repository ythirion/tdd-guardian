'use strict'

const PLUGIN_FILES = {
  rule: 'the files in .tdd/ belong to the plugin and are never edited by hand.',
  why: 'the state records what was verified (test count, test-code hash, assertion count); editing it would fake a verification.',
  action: 'move between phases with `node <plugin>/scripts/tdd.js next`; it checks the exit conditions itself.',
}

// What each phase forbids, by file kind, with the teaching behind it.
// A missing entry means the write is allowed.
const FORBIDDEN_WRITES = {
  GREEN: {
    test: {
      rule: 'in GREEN, tests are read-only (unit tests, Fakes, builders, business assertions).',
      why: 'changing a test to get to green proves nothing: the test must stay the fixed target the code is written against.',
      action: 'write the minimal production code that makes the failing test pass (fake it, then triangulate). If the test itself is wrong, say so and ask the human.',
    },
  },
}

function forbiddenWrite(phase, kind) {
  if (kind === 'guard') return PLUGIN_FILES
  return (FORBIDDEN_WRITES[phase] || {})[kind] || null
}

module.exports = { forbiddenWrite }
