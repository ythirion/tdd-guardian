#!/usr/bin/env node
'use strict'
// PreToolUse on Write|Edit|MultiEdit|NotebookEdit: blocks the writes the current phase forbids.
const { readInput, projectRoot, EXIT_ALLOW, EXIT_BLOCK } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { classify } = require('./lib/classify')
const { explain } = require('./lib/messages')
const { loadState } = require('./lib/state')
const { forbiddenWrite } = require('./lib/rules')

const input = readInput()
if (!input || !input.tool_input) process.exit(EXIT_ALLOW)

const root = projectRoot(input)
const config = loadConfig(root)
const file = input.tool_input.file_path || input.tool_input.notebook_path || ''
const kind = classify(file, root, config)

const { phase } = loadState(root)
const forbidden = forbiddenWrite(phase, kind)
if (forbidden) {
  process.stderr.write(explain(forbidden) + '\n')
  process.exit(EXIT_BLOCK)
}
process.exit(EXIT_ALLOW)
