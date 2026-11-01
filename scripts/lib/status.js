'use strict'
const { loadState } = require('./state')
const { readItems, unitItems, scenarios } = require('./test-list')

const REVIEW_CHECKLIST = [
  'Would I understand this test in five seconds without opening another file?',
  'Does the name say the context and the outcome in business language?',
  'Does the Arrange show only what this test is about?',
  'Does the Assert read as a business sentence, and check the side effects the business requires?',
  'Is there a rule behind these examples that a property should state?',
  'If I break the code this test covers, does it turn red? (/tdd:mutate answers it)',
]

const PHASE_RULES = {
  OFF: 'No enforcement. Start a feature with /tdd:start <feature>.',
  LIST: 'Only .tdd/test-list.md is writable. Draft the list, then the human runs /tdd:approve.',
  ACCEPTANCE: 'Write one acceptance test (Fakes for every port), see it fail, then `tdd.js next`. No unit test, no production code.',
  RED: 'Write exactly one unit test (plus Fakes and test support), see it fail for the right reason, then `tdd.js next`. No production code.',
  GREEN: 'Minimal production code only: tests, Fakes and test support are read-only. Then `tdd.js next`.',
  REFACTOR: 'Improve code and tests, behaviour unchanged, green after every change, no check removed. Tick the item, then `tdd.js next`.',
}

const progress = (items) => `${items.filter((i) => i.done).length}/${items.length}`
const colour = (green) => (green === undefined ? 'not run' : green ? 'green' : 'red')

function statusReport(root) {
  const state = loadState(root)
  const items = readItems(root)
  const lines = [
    `Feature: ${state.feature || '-'}`,
    `Mode: ${state.mode || '-'}`,
    `Phase: ${state.phase}  (${PHASE_RULES[state.phase]})`,
    `Current test: ${state.currentTest || '-'}`,
  ]
  if (state.mode === 'outside-in') {
    lines.push(`Acceptance test: ${state.acceptanceTest || '-'}`)
    lines.push(`Scenarios: ${progress(scenarios(items))} green`)
  }
  lines.push(`Unit items: ${progress(unitItems(items))} ticked`)
  const run = state.lastRun
  lines.push(`Last run: ${run ? `unit ${colour(run.unitGreen)}, acceptance ${colour(run.acceptanceGreen)} at ${run.at}` : '-'}`)
  const mocks = state.justifiedMocks || []
  lines.push(`Justified mocks to review: ${mocks.length === 0 ? 'none' : ''}`)
  for (const m of mocks) lines.push(`  - ${m.file}:${m.line} ${m.reason}`)
  lines.push('Review checklist:')
  for (const question of REVIEW_CHECKLIST) lines.push(`  - [ ] ${question}`)
  return lines.join('\n')
}

module.exports = { statusReport, PHASE_RULES, REVIEW_CHECKLIST }
