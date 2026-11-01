'use strict'
const { loadState } = require('./state')
const { loadConfig } = require('./config')
const { classify } = require('./classify')
const { runSuite } = require('./runner')

const INSTALL_HINTS = [
  'JS/TS: npm install --save-dev @stryker-mutator/core (then npx stryker init)',
  'C#: dotnet tool install -g dotnet-stryker',
  'Java: add org.pitest:pitest-maven to the pom.xml build plugins',
  'Python: pip install mutmut',
].join('\n  ')

const SURVIVOR_ADVICE = 'For each surviving mutant, add one item to .tdd/test-list.md. A survivor on a side effect '
  + '(an event, a save, a notification) usually means a test checks the return value or the exception but not the business '
  + 'consequence: the item should name the business assertion to add.'

// Feedback tool, never a guard: always succeeds.
function mutate(root) {
  const config = loadConfig(root)
  const state = loadState(root)
  if (!config.mutationCommand) return { ok: true, message: `No mutationCommand in .tdd/config.json. Install a tool:\n  ${INSTALL_HINTS}` }
  const files = (state.touchedFiles || []).filter((file) => classify(file, root, config) === 'production')
  if (files.length === 0) return { ok: true, message: 'No production file touched since /tdd:start: nothing to mutate.' }
  const command = config.mutationCommand.includes('{files}')
    ? config.mutationCommand.replace('{files}', files.join(','))
    : config.mutationCommand
  const run = runSuite(command, root)
  if (run.exitCode === 127 || /command not found|not recognized as|could not determine executable/i.test(run.output)) {
    return { ok: true, message: `The mutation tool is not installed (${command}). Install it:\n  ${INSTALL_HINTS}` }
  }
  return { ok: true, message: `Mutation testing on: ${files.join(', ')}\n${run.output}\n${SURVIVOR_ADVICE}` }
}

module.exports = { mutate }
