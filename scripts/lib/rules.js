'use strict'

const PLUGIN_FILES = {
  rule: 'the files in .tdd/ belong to the plugin and are never edited by hand.',
  why: 'the state records what was verified (test count, test-code hash, assertion count); editing it would fake a verification.',
  action: 'move between phases with `node <plugin>/scripts/tdd.js next`; it checks the exit conditions itself.',
}

// What each phase forbids, by file kind, with the teaching behind it.
// A missing entry means the write is allowed.
const FORBIDDEN_WRITES = {
  RED: {
    production: {
      rule: 'in RED, no production code: only one new failing test (plus the Fakes and test support it needs).',
      why: 'a test written with or after its code tends to be tautological; seeing it fail first proves it can fail, for the right reason.',
      action: 'finish the test, run the unit suite, check it fails for the expected reason, then run `tdd.js next` to enter GREEN.',
    },
    acceptance: {
      rule: 'in RED, the acceptance tests are read-only.',
      why: 'the outer test is the fixed goal of this double loop; the inner unit cycles drive towards it without moving it.',
      action: 'write the unit test the acceptance test needs next. Change the acceptance test only in REFACTOR, behaviour unchanged.',
    },
  },
  GREEN: {
    test: {
      rule: 'in GREEN, tests are read-only (unit tests, Fakes, builders, business assertions).',
      why: 'changing a test to get to green proves nothing: the test must stay the fixed target the code is written against.',
      action: 'write the minimal production code that makes the failing test pass (fake it, then triangulate). If the test itself is wrong, say so and ask the human.',
    },
    'test-list': {
      rule: 'in GREEN, the test list is frozen.',
      why: 'GREEN is about one test only; growing the list now pulls attention to the next cases and invites code for them.',
      action: 'note the new case mentally and add it to .tdd/test-list.md in REFACTOR (or RED), then keep the code minimal.',
    },
  },
}

function forbiddenWrite(phase, kind) {
  if (kind === 'guard') return PLUGIN_FILES
  return (FORBIDDEN_WRITES[phase] || {})[kind] || null
}

module.exports = { forbiddenWrite }
