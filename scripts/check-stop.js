#!/usr/bin/env node
'use strict'
// Stop: the agent does not hand back in the middle of a cycle.
const { readInput, projectRoot, isTddProject, block, EXIT_ALLOW } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { loadState } = require('./lib/state')
const { runSuite } = require('./lib/runner')
const { explain } = require('./lib/messages')
const { testCount } = require('./lib/measures')

const input = readInput()
const root = projectRoot(input)
if (!input || !isTddProject(root)) process.exit(EXIT_ALLOW)

const config = loadConfig(root)
const state = loadState(root)
const { phase } = state

// Already continued once because of this hook: let it stop rather than loop forever.
const blockOnce = (lesson) => {
  if (input.stop_hook_active) {
    process.stderr.write(`tdd-guardian: warning, stopping anyway (already blocked once):\n${lesson}\n`)
    process.exit(EXIT_ALLOW)
  }
  block(lesson, config)
}

if (phase === 'GREEN' || phase === 'REFACTOR') {
  const run = runSuite(config.testCommand, root)
  if (!run.green) blockOnce(explain({
    rule: `the unit suite must be green before handing back (phase ${phase}).`,
    why: 'stopping on red leaves the human with broken code and no clear next step.',
    action: phase === 'GREEN'
      ? 'finish the minimal production code until the suite is green, then `tdd.js next`.'
      : 'undo or fix the last refactoring until the suite is green again.',
  }))
}
if (phase === 'RED' || phase === 'ACCEPTANCE') {
  const kind = phase === 'RED' ? 'test' : 'acceptance'
  const baseline = phase === 'RED' ? state.unitTestCountAtRed : state.acceptanceTestCountAtAcceptance
  const hasNewTest = testCount(root, config, kind) > (baseline || 0)
  const failing = hasNewTest && !runSuite(phase === 'RED' ? config.testCommand : config.acceptanceCommand, root).green
  if (!failing) blockOnce(explain({
    rule: `${phase} ends with one new failing test; there is none yet.`,
    why: 'handing back without the failing test leaves the cycle half done: the next step has nothing to drive it.',
    action: `write the ${phase === 'RED' ? 'unit' : 'acceptance'} test for the next item, run it, see it fail, then \`tdd.js next\`.`,
  }))
}
process.exit(EXIT_ALLOW)
