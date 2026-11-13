#!/usr/bin/env node
'use strict'
// UserPromptSubmit: fires only on what the human types, so it is where the human-only
// transitions happen. /tdd:approve, /tdd:off and /tdd:next (which ends a review pause) are performed
// here, in-process.
const { readInput, projectRoot, isTddProject, EXIT_ALLOW } = require('./lib/hook-io')
const cycle = require('./lib/cycle')

const HUMAN_COMMAND = /^\s*\/tdd:(approve|off|next)\b/

const input = readInput()
const match = input && typeof input.prompt === 'string' && HUMAN_COMMAND.exec(input.prompt)
const root = projectRoot(input)
if (!match || !isTddProject(root)) process.exit(EXIT_ALLOW)

const ACTIONS = { approve: () => cycle.approve(root), off: () => cycle.off(root), next: () => cycle.next(root, { byHuman: true }) }
const result = ACTIONS[match[1]]()
const context = `tdd-guardian: the human ran /tdd:${match[1]}. ${result.ok ? '' : 'Not applied: '}${result.message}`
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } }))
process.exit(EXIT_ALLOW)
