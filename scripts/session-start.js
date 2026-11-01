#!/usr/bin/env node
'use strict'
// SessionStart: reminds the agent where the cycle stands. Written as facts, not orders.
const { readInput, projectRoot, isTddProject, EXIT_ALLOW } = require('./lib/hook-io')
const { loadState } = require('./lib/state')
const { readItems } = require('./lib/test-list')
const { PHASE_RULES } = require('./lib/status')
const { loadConfig } = require('./lib/config')
const { stackLine } = require('./lib/stack')

const input = readInput()
const root = projectRoot(input)
if (!isTddProject(root)) process.exit(EXIT_ALLOW)
const state = loadState(root)
if (state.phase === 'OFF') process.exit(EXIT_ALLOW)

const remaining = readItems(root).filter((item) => !item.done).map((item) => item.text)
const lines = [
  `TDD Guardian (tdd plugin) is active on feature "${state.feature}", mode ${state.mode}.`,
  stackLine(loadConfig(root).stack) || null,
  `Phase: ${state.phase}. Rules of this phase: ${PHASE_RULES[state.phase]}`,
  state.mode === 'outside-in' ? `Acceptance test: ${state.acceptanceTest || 'not written yet'}` : null,
  `Current test: ${state.currentTest || '-'}`,
  `Remaining: ${remaining.length ? remaining.join('; ') : 'none'}`,
  'State: .tdd/state.json (read-only), list: .tdd/test-list.md. Phase changes go through `tdd.js next`; the tdd skill describes the process.',
].filter(Boolean)

process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } }))
process.exit(EXIT_ALLOW)
