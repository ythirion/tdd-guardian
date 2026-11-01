'use strict'
const { filesOfKind, read } = require('./files')
const { countTests, findDisablingMarkers } = require('./counting')
const { findNewMocks } = require('./mocks')

function newDisablingMarkers(before, after) {
  const existing = findDisablingMarkers(before)
  return findDisablingMarkers(after).filter((marker) => {
    const index = existing.indexOf(marker)
    if (index === -1) return true
    existing.splice(index, 1)
    return false
  })
}

function disablingMarkerCheck({ before, after }) {
  const added = newDisablingMarkers(before, after)
  if (added.length === 0) return null
  return {
    rule: `a test is never disabled to get to green (found: ${added.join(', ')}).`,
    why: 'a skipped test is a lie in the suite: it reports nothing while looking covered.',
    action: 'remove the marker. If the test is wrong, fix it in REFACTOR; if it is premature, remove it and put the case back in .tdd/test-list.md.',
  }
}

function oneTestAtATimeCheck({ root, config, state, rel, kind, after }) {
  const others = filesOfKind(root, config, [kind]).filter((f) => f !== rel)
  const totalAfter = others.reduce((sum, f) => sum + countTests(read(root, f)), 0) + countTests(after)
  const baseline = state.phase === 'RED' ? state.unitTestCountAtRed : state.acceptanceTestCountAtAcceptance
  const newTests = totalAfter - (baseline ?? totalAfter)
  if (newTests <= 1) return null
  return {
    rule: `one test at a time: this write leaves ${newTests} new tests since entering ${state.phase}, the limit is 1.`,
    why: 'several tests then all the code skips the feedback of each failure and invites code written for cases not yet seen.',
    action: 'keep the simplest unticked item as the only new test; leave the other cases in .tdd/test-list.md for the next cycles.',
  }
}

function mockPolicyCheck({ config, state, before, after }) {
  const policy = config.mockPolicy[state.mode] || 'allow'
  if (policy === 'allow') return null
  const offending = findNewMocks(before, after, config.mockPatterns)
    .filter((mock) => policy === 'forbid' || !mock.justified)
  if (offending.length === 0) return null
  const where = offending.map((m) => `line ${m.line}: ${m.text.trim()}`).join('; ')
  const fake = {
    rule: `mockPolicy is "${policy}" in ${state.mode} mode: no unjustified interaction mock (${where}).`,
    why: 'a mock asserting on calls couples the test to the implementation; a refactoring then breaks tests while the behaviour is unchanged.',
  }
  return policy === 'forbid'
    ? { ...fake, rule: `mockPolicy is "forbid" in ${state.mode} mode: mocking libraries are not allowed, even justified (${where}).`,
      action: 'write a Fake: a small in-memory implementation of the port (see references/fakes.md), and assert on the state it exposes.' }
    : { ...fake, action: 'replace it with a Fake (in-memory implementation of the port, in fakePatterns, see references/fakes.md) and assert on the state it exposes. '
      + 'If no port exists (third-party SDK, legacy code), add `tdd-guard: allow-mock <reason>` on the same or previous line.' }
}

// Checks on the proposed content of the test being written in ACCEPTANCE or RED.
function checkNewTest(context) {
  for (const check of [disablingMarkerCheck, oneTestAtATimeCheck, mockPolicyCheck]) {
    const lesson = check(context)
    if (lesson) return lesson
  }
  return null
}

// Justified mocks, to be listed by /tdd:status for review.
function justifiedMocks({ config, before, after, rel }) {
  return findNewMocks(before, after, config.mockPatterns)
    .filter((mock) => mock.justified)
    .map(({ line, reason }) => ({ file: rel, line, reason }))
}

const writesTheNewTest = (phase, kind) => (phase === 'RED' && kind === 'test') || (phase === 'ACCEPTANCE' && kind === 'acceptance')

module.exports = { checkNewTest, writesTheNewTest, justifiedMocks }
