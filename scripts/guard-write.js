#!/usr/bin/env node
'use strict'
// PreToolUse on Write|Edit|MultiEdit|NotebookEdit (and GitHub Copilot's apply_patch, sent as Edit):
// blocks the writes the current phase forbids.
const { readInput, projectRoot, isTddProject, block: blockOrWarn, EXIT_ALLOW } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { classify, relativeTo } = require('./lib/classify')
const { explain } = require('./lib/messages')
const { loadState, saveState } = require('./lib/state')
const { forbiddenWrite } = require('./lib/rules')
const { proposedWrites } = require('./lib/proposed')
const { checkNewTest, writesTheNewTest, justifiedMocks } = require('./lib/write-checks')

const input = readInput()
if (!input || !input.tool_input) process.exit(EXIT_ALLOW)

const root = projectRoot(input)
if (!isTddProject(root)) process.exit(EXIT_ALLOW)
const config = loadConfig(root)
const state = loadState(root)
const block = (lesson) => blockOrWarn(explain(lesson), config)

const updates = {}
for (const { file, before, after } of proposedWrites(input.tool_name, input.tool_input, root)) {
  const rel = relativeTo(root, file)
  const kind = classify(file, root, config)

  const forbidden = forbiddenWrite(state.phase, kind)
  if (forbidden) block(forbidden)

  if (writesTheNewTest(state.phase, kind)) {
    const context = { root, config, state, rel, kind, before, after }
    const lesson = checkNewTest(context)
    if (lesson) block(lesson)
    const justified = justifiedMocks(context)
    if (justified.length > 0) {
      const known = updates.justifiedMocks || state.justifiedMocks || []
      const isNew = (m) => !known.some((k) => k.file === m.file && k.line === m.line)
      updates.justifiedMocks = [...known, ...justified.filter(isNew)]
    }
  }

  // Files touched since /tdd:start: the scope of /tdd:mutate.
  const touched = updates.touchedFiles || state.touchedFiles || []
  if (state.phase !== 'OFF' && ['test', 'acceptance', 'production'].includes(kind) && !touched.includes(rel)) {
    updates.touchedFiles = [...touched, rel]
  }
}
if (Object.keys(updates).length > 0) saveState(root, { ...state, ...updates })
process.exit(EXIT_ALLOW)
