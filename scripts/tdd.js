#!/usr/bin/env node
'use strict'
// Phase transition CLI. The agent may run `next`, `status` and `mutate`; `approve` and `off` are human-only.
const cycle = require('./lib/cycle')
const { statusReport } = require('./lib/status')
const { mutate } = require('./lib/mutate')

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const [command, ...rest] = process.argv.slice(2)

function option(name) {
  const index = rest.indexOf(`--${name}`)
  return index === -1 ? undefined : rest[index + 1]
}
const positional = () => rest.filter((arg, i) => !arg.startsWith('--') && !(rest[i - 1] || '').startsWith('--')).join(' ')

// Claude Code sets CLAUDECODE in the shell of its Bash tool: approving or stopping is not the agent's call.
function humanOnly(action) {
  return () => process.env.CLAUDECODE
    ? { ok: false, message: 'tdd-guard: approve and off are reserved for the human. Why: the test list review and the decision to stop '
      + 'enforcing TDD are human checkpoints. Do instead: ask the human to run /tdd:approve or /tdd:off.' }
    : action()
}

const commands = {
  start: () => cycle.start(root, { feature: positional(), mode: option('mode') }),
  mode: () => cycle.setMode(root, positional()),
  next: () => cycle.next(root),
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
