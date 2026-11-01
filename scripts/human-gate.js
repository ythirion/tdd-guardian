#!/usr/bin/env node
'use strict'
// UserPromptSubmit: fires only on what the human types, so it is where the human-only
// transitions happen. /tdd:approve and /tdd:off are performed here, in-process.
const { readInput, projectRoot, isTddProject, EXIT_ALLOW } = require('./lib/hook-io')
const cycle = require('./lib/cycle')

const HUMAN_COMMAND = /^\s*\/tdd:(approve|off)\b/

const input = readInput()
const match = input && typeof input.prompt === 'string' && HUMAN_COMMAND.exec(input.prompt)
const root = projectRoot(input)
if (!match || !isTddProject(root)) process.exit(EXIT_ALLOW)

const result = match[1] === 'approve' ? cycle.approve(root) : cycle.off(root)
const context = `tdd-guardian: the human ran /tdd:${match[1]}. ${result.ok ? '' : 'Not applied: '}${result.message}`
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } }))
process.exit(EXIT_ALLOW)
