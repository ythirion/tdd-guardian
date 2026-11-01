#!/usr/bin/env node
'use strict'
// PreToolUse on Write|Edit|MultiEdit|NotebookEdit: blocks the writes the current phase forbids.
const path = require('node:path')
const { readInput, projectRoot, EXIT_ALLOW, EXIT_BLOCK } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { classify, relativeTo } = require('./lib/classify')
const { explain } = require('./lib/messages')
const { loadState } = require('./lib/state')
const { forbiddenWrite } = require('./lib/rules')
const { proposedContent } = require('./lib/proposed')
const { checkNewTest, writesTheNewTest } = require('./lib/write-checks')

const input = readInput()
if (!input || !input.tool_input) process.exit(EXIT_ALLOW)

const root = projectRoot(input)
const config = loadConfig(root)
const file = input.tool_input.file_path || input.tool_input.notebook_path || ''
const rel = relativeTo(root, file)
const kind = classify(file, root, config)
const state = loadState(root)

const block = (lesson) => {
  process.stderr.write(explain(lesson) + '\n')
  process.exit(EXIT_BLOCK)
}

const forbidden = forbiddenWrite(state.phase, kind)
if (forbidden) block(forbidden)

if (writesTheNewTest(state.phase, kind)) {
  const { before, after } = proposedContent(input.tool_name, input.tool_input, path.resolve(root, rel))
  const lesson = checkNewTest({ root, config, state, rel, kind, before, after })
  if (lesson) block(lesson)
}
process.exit(EXIT_ALLOW)
