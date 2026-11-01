'use strict'
const { filesOfKind, read } = require('./files')
const { countTests, findDisablingMarkers } = require('./counting')

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

// Checks on the proposed content of the test being written in ACCEPTANCE or RED.
function checkNewTest(context) {
  for (const check of [disablingMarkerCheck, oneTestAtATimeCheck]) {
    const lesson = check(context)
    if (lesson) return lesson
  }
  return null
}

const writesTheNewTest = (phase, kind) => (phase === 'RED' && kind === 'test') || (phase === 'ACCEPTANCE' && kind === 'acceptance')

module.exports = { checkNewTest, writesTheNewTest }
