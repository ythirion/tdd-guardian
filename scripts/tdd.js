#!/usr/bin/env node
'use strict'
// Phase transition CLI. The agent may run `next`, `status` and `mutate`; `approve` and `off` are human-only.
const cycle = require('./lib/cycle')

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const [command, ...rest] = process.argv.slice(2)

function option(name) {
  const index = rest.indexOf(`--${name}`)
  return index === -1 ? undefined : rest[index + 1]
}
const positional = () => rest.filter((arg, i) => !arg.startsWith('--') && !(rest[i - 1] || '').startsWith('--')).join(' ')

const commands = {
  start: () => cycle.start(root, { feature: positional(), mode: option('mode') }),
  mode: () => cycle.setMode(root, positional()),
}

const run = commands[command]
if (!run) {
  console.error(`Usage: tdd.js <${Object.keys(commands).join('|')}>`)
  process.exit(2)
}
const result = run()
console.log(result.message)
process.exit(result.ok ? 0 : 1)
