'use strict'
// Phase transitions. Every function returns { ok, message } and saves the state on success.
const { loadState, saveState, canChangeMode, MODES } = require('./state')
const fs = require('node:fs')
const path = require('node:path')
const { loadConfig, configPath, detectConfig, DEFAULT_CONFIG } = require('./config')
const { writeSkeleton, readItems, unitItems, firstOpen } = require('./test-list')
const { hashTestCode } = require('./hash')
const { testCount, testCountsByFile, filesWithNewTests, assertionCount } = require('./measures')
const { runSuite } = require('./runner')

const plural = (n, word) => `${n} new ${word}${n === 1 ? '' : 's'}`
const lastRun = (fields) => ({ ...fields, at: new Date().toISOString() })

const refuse = (message) => ({ ok: false, message })
const done = (root, state, message) => { saveState(root, state); return { ok: true, message } }

// Writes .tdd/config.json from the detected build file. Returns a note for the human to review.
function ensureConfig(root) {
  if (fs.existsSync(configPath(root))) return ''
  const detected = detectConfig(root)
  fs.mkdirSync(path.dirname(configPath(root)), { recursive: true })
  fs.writeFileSync(configPath(root), JSON.stringify(detected ? detected.config : DEFAULT_CONFIG, null, 2) + '\n')
  return `Created .tdd/config.json (${detected ? detected.ecosystem : 'defaults, no build file found'}): `
    + 'review testCommand, acceptanceCommand and the file patterns with the human.\n'
}

const MODE_LOCKED = (phase) => `The mode can only change in OFF or LIST (current phase: ${phase}). `
  + 'Switching strategy mid-cycle would leave the current test without its loop; finish the feature or ask the human to run /tdd:off.'

function start(root, { feature, mode }) {
  const state = loadState(root)
  if (!canChangeMode(state.phase)) return refuse(MODE_LOCKED(state.phase))
  const configNote = ensureConfig(root)
  const config = loadConfig(root)
  const chosenMode = mode || config.defaultMode
  if (!MODES.includes(chosenMode)) return refuse(`Unknown mode "${chosenMode}": use inside-out or outside-in.`)
  writeSkeleton(root, feature, chosenMode)
  return done(root, { ...state, mode: chosenMode, phase: 'LIST', feature, justifiedMocks: [], touchedFiles: [] },
    `${configNote}LIST (${chosenMode}): draft .tdd/test-list.md, then ask the human to run /tdd:approve.`)
}

function setMode(root, mode) {
  const state = loadState(root)
  if (!canChangeMode(state.phase)) return refuse(MODE_LOCKED(state.phase))
  if (!MODES.includes(mode)) return refuse(`Unknown mode "${mode}": use inside-out or outside-in.`)
  return done(root, { ...state, mode }, `Mode set to ${mode}.`)
}

function enterAcceptance(root, config, state) {
  return { ...state, phase: 'ACCEPTANCE',
    acceptanceTestCountAtAcceptance: testCount(root, config, 'acceptance'),
    acceptanceTestCountsAtAcceptance: testCountsByFile(root, config, 'acceptance') }
}

function enterRed(root, config, state) {
  return { ...state, phase: 'RED', unitTestCountAtRed: testCount(root, config, 'test') }
}

// Human only: the CLI refuses it from an agent shell, the human-gate hook calls it in-process.
function approve(root) {
  const state = loadState(root)
  const config = loadConfig(root)
  if (state.phase !== 'LIST') return refuse(`Nothing to approve: the test list is approved in LIST (current phase: ${state.phase}).`)
  if (state.mode === 'outside-in') {
    return done(root, enterAcceptance(root, config, state),
      'Test list approved. ACCEPTANCE: write one acceptance test for the first scenario, wiring Fakes for every port, see it fail, then `tdd.js next`.')
  }
  return done(root, enterRed(root, config, state),
    'Test list approved. RED: write exactly one unit test for the simplest unticked item, see it fail, then `tdd.js next`.')
}

function off(root) {
  const state = loadState(root)
  return done(root, { ...state, phase: 'OFF' }, 'TDD guard is OFF: every file is writable again.')
}

function leaveAcceptance(root, state, config) {
  const newTests = testCount(root, config, 'acceptance') - (state.acceptanceTestCountAtAcceptance || 0)
  if (newTests !== 1) {
    return refuse(`ACCEPTANCE needs exactly one new acceptance test; found ${plural(newTests, 'acceptance test')}. `
      + 'One scenario at a time keeps the outer loop focused: write the test for the next scenario only.')
  }
  const run = runSuite(config.acceptanceCommand, root)
  if (run.green) {
    return refuse('The new acceptance test passes already: it must fail first, or it proves nothing about the code still to write. '
      + 'Check it exercises the new behaviour through the use case or API boundary.')
  }
  const [acceptanceTest] = filesWithNewTests(root, config, 'acceptance', state.acceptanceTestCountsAtAcceptance)
  return done(root, { ...enterRed(root, config, state), acceptanceTest, lastRun: lastRun({ acceptanceGreen: false }) },
    `Acceptance test red, as expected (${acceptanceTest}). RED: write the first unit test the acceptance test needs, `
    + 'starting from the outermost unit; name any new collaborator as a port and give it a Fake.')
}

function leaveRed(root, state, config) {
  const newTests = testCount(root, config, 'test') - (state.unitTestCountAtRed || 0)
  if (newTests !== 1) {
    return refuse(`RED needs exactly one new unit test; found ${plural(newTests, 'unit test')}. `
      + 'One test at a time: each failure drives one small step of code.')
  }
  const run = runSuite(config.testCommand, root)
  if (run.green) {
    return refuse('The unit suite is green: the new test has not been seen failing. A test that never failed may be tautological. '
      + 'Check it asserts the new behaviour and run it again; it must fail for the expected reason before any code is written.')
  }
  // The suite was green on entering RED and production code is read-only in RED,
  // so the one new test is the only failing one.
  const currentTest = firstOpen(unitItems(readItems(root))) || state.currentTest || '(unnamed)'
  return done(root, { ...state, phase: 'GREEN', currentTest, testFilesHashAtGreen: hashTestCode(root, config),
    lastRun: lastRun({ ...state.lastRun, unitGreen: false }) },
  `Test seen failing. GREEN (${currentTest}): write the minimal production code (fake it, triangulate later). `
    + 'Tests, Fakes and builders are read-only. Then `tdd.js next`.\n--- failure ---\n' + run.output.slice(-800))
}

function leaveGreen(root, state, config) {
  const run = runSuite(config.testCommand, root)
  if (!run.green) {
    return refuse('The unit suite is red: GREEN ends when every unit test passes. '
      + 'Keep writing the minimal production code for the failing test.\n--- failure ---\n' + run.output.slice(-800))
  }
  if (hashTestCode(root, config) !== state.testFilesHashAtGreen) {
    return refuse('The test code changed during GREEN (tests, Fakes, builders or business assertions). '
      + 'Green was reached by moving the target, which proves nothing. Restore the test code as it was on entering GREEN '
      + '(e.g. `git diff` on the test files) and make it pass with production code only.')
  }
  return done(root, { ...state, phase: 'REFACTOR', assertionCountAtRefactor: assertionCount(root, config),
    lastRun: lastRun({ ...state.lastRun, unitGreen: true }) },
  'Green. REFACTOR: remove duplication, name, extract, refactor the tests towards the guidelines; green after every change. '
    + `Tick "${state.currentTest}" in .tdd/test-list.md, then \`tdd.js next\`.`)
}

function refactorExitProblem(root, state, config, items) {
  const run = runSuite(config.testCommand, root)
  if (!run.green) {
    return 'The unit suite is red: a refactoring changes structure, not behaviour, so the suite must stay green. '
      + 'Undo the last change or fix it.\n--- failure ---\n' + run.output.slice(-800)
  }
  const assertions = assertionCount(root, config)
  if (assertions < (state.assertionCountAtRefactor || 0)) {
    return `The assertion count dropped from ${state.assertionCountAtRefactor} to ${assertions}: refactoring tests must never remove a check. `
      + 'Restore it, or move it into a business assertion (counted through assertionMethodPatterns).'
  }
  const current = items.find((item) => item.text === state.currentTest)
  if (current && !current.done) return `Tick "${state.currentTest}" in .tdd/test-list.md before moving on: the list is the progress record.`
  return null
}

function leaveRefactor(root, state, config) {
  const items = readItems(root)
  const problem = refactorExitProblem(root, state, config, items)
  if (problem) return refuse(problem)
  const next = firstOpen(unitItems(items))
  if (!next) {
    return done(root, { ...state, phase: 'OFF', lastRun: lastRun({ ...state.lastRun, unitGreen: true }) },
      `Feature "${state.feature}" done: every item is ticked and the suite is green. OFF. Consider /tdd:mutate to check the tests bite.`)
  }
  return done(root, { ...enterRed(root, config, state), lastRun: lastRun({ ...state.lastRun, unitGreen: true }) },
    `RED: write exactly one unit test for "${next}", see it fail, then \`tdd.js next\`.`)
}

const NEXT = {
  REFACTOR: leaveRefactor,
  GREEN: leaveGreen,
  RED: leaveRed,
  ACCEPTANCE: leaveAcceptance,
  OFF: () => refuse('No feature in progress: the human starts one with /tdd:start <feature>.'),
  LIST: () => refuse('The test list must be approved by a human: ask them to review .tdd/test-list.md and run /tdd:approve.'),
}

function next(root) {
  const state = loadState(root)
  return NEXT[state.phase](root, state, loadConfig(root))
}

module.exports = { start, setMode, approve, off, next }
