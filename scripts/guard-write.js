#!/usr/bin/env node
'use strict'
// PreToolUse on Write|Edit|MultiEdit|NotebookEdit: blocks the writes the current phase forbids.
const { readInput, projectRoot, EXIT_ALLOW, EXIT_BLOCK } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { classify } = require('./lib/classify')
const { explain } = require('./lib/messages')
const { loadState } = require('./lib/state')
const { forbiddenWrite } = require('./lib/rules')
const path = require('node:path')
const { relativeTo } = require('./lib/classify')
const { proposedContent } = require('./lib/proposed')
const { filesOfKind, read } = require('./lib/files')
const { countTests } = require('./lib/counting')

const input = readInput()
if (!input || !input.tool_input) process.exit(EXIT_ALLOW)

const root = projectRoot(input)
const config = loadConfig(root)
const file = input.tool_input.file_path || input.tool_input.notebook_path || ''
const kind = classify(file, root, config)

const block = (lesson) => {
  process.stderr.write(explain(lesson) + '\n')
  process.exit(EXIT_BLOCK)
}

const state = loadState(root)
const { phase } = state
const forbidden = forbiddenWrite(phase, kind)
if (forbidden) block(forbidden)

const writesTheNewTest = (phase === 'RED' && kind === 'test') || (phase === 'ACCEPTANCE' && kind === 'acceptance')
if (writesTheNewTest) {
  const rel = relativeTo(root, file)
  const { after } = proposedContent(input.tool_name, input.tool_input, path.resolve(root, rel))
  const others = filesOfKind(root, config, [kind]).filter((f) => f !== rel)
  const totalAfter = others.reduce((sum, f) => sum + countTests(read(root, f)), 0) + countTests(after)
  const baseline = phase === 'RED' ? state.unitTestCountAtRed : state.acceptanceTestCountAtAcceptance
  const newTests = totalAfter - (baseline ?? totalAfter)
  if (newTests > 1) block({
    rule: `one test at a time: this write leaves ${newTests} new tests since entering ${phase}, the limit is 1.`,
    why: 'several tests then all the code skips the feedback of each failure and invites code written for cases not yet seen.',
    action: 'keep the simplest unticked item as the only new test; leave the other cases in .tdd/test-list.md for the next cycles.',
  })
}
process.exit(EXIT_ALLOW)
