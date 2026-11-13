#!/usr/bin/env node
'use strict'
// Phase transition CLI. The agent may run `next`, `status` and `mutate`; `approve` and `off` are human-only.
const cycle = require('./lib/cycle')
const { statusReport } = require('./lib/status')
const { mutate } = require('./lib/mutate')
const { detectStack } = require('./lib/stack')

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const [command, ...rest] = process.argv.slice(2)

function option(name) {
  const index = rest.indexOf(`--${name}`)
  return index === -1 ? undefined : rest[index + 1]
}
const positional = () => rest.filter((arg, i) => !arg.startsWith('--') && !(rest[i - 1] || '').startsWith('--')).join(' ')

// The agent's shell is marked: CLAUDECODE (Claude Code), COPILOT_CLI (GitHub Copilot CLI).
// Approving or stopping is not the agent's call.
const AGENT_SHELL_MARKERS = ['CLAUDECODE', 'COPILOT_CLI']
const inAgentShell = () => AGENT_SHELL_MARKERS.some((marker) => process.env[marker])
function humanOnly(action) {
  return () => inAgentShell()
    ? { ok: false, message: 'tdd-guardian: approve and off are reserved for the human. Why: the test list review and the decision to stop '
      + 'enforcing TDD are human checkpoints. Do instead: ask the human to run /tdd:approve or /tdd:off.' }
    : action()
}

const commands = {
  start: () => cycle.start(root, { feature: positional(), mode: option('mode'),
    stack: { language: option('language'), testing: option('test-stack'), additional: option('stack') } }),
  detect: () => ({ ok: true, message: JSON.stringify(detectStack(root)) }),
  mode: () => cycle.setMode(root, positional()),
  next: () => cycle.next(root, { byHuman: !inAgentShell() }),
  status: () => ({ ok: true, message: statusReport(root) }),
  mutate: () => mutate(root),
  approve: humanOnly(() => cycle.approve(root)),
  off: humanOnly(() => cycle.off(root)),
}

const run = commands[command]
if (!run) {
  console.error(`Usage: tdd.js <${Object.keys(commands).join('|')}>`)
  process.exit(2)
}
const result = run()
console.log(result.message)
process.exit(result.ok ? 0 : 1)
