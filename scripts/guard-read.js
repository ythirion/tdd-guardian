#!/usr/bin/env node
'use strict'
// PreToolUse on Read|Grep|Glob|Bash: the implementer works from the failing test alone.
const { readInput, projectRoot, isTddProject, block, EXIT_ALLOW } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { explain } = require('./lib/messages')

const input = readInput()
const isImplementer = input && /(^|:)tdd-implementer$/.test(input.agent_type || '')
const root = projectRoot(input)
if (!isImplementer || !isTddProject(root)) process.exit(EXIT_ALLOW)

const toolInput = input.tool_input || {}
const looked = [toolInput.file_path, toolInput.path, toolInput.pattern, toolInput.command].filter(Boolean).join(' ')
if (/\.tdd(\/|\\|\b)/.test(looked)) {
  block(explain({
    rule: 'tdd-implementer does not read .tdd/ (test list and state).',
    why: 'knowing the next cases tempts code for them; GREEN is about the one failing test, with the minimal code.',
    action: 'work from the failing test and its output only; the orchestrator holds the list.',
  }), loadConfig(root))
}
process.exit(EXIT_ALLOW)
