#!/usr/bin/env node
'use strict'
// PreToolUse on Bash: closes the obvious bypasses of guard-write. A heuristic, not a sandbox.
const fs = require('node:fs')
const path = require('node:path')
const { readInput, projectRoot, isTddProject, block, EXIT_ALLOW } = require('./lib/hook-io')
const { loadConfig } = require('./lib/config')
const { loadState } = require('./lib/state')
const { classify, relativeTo } = require('./lib/classify')
const { forbiddenWrite } = require('./lib/rules')
const { explain } = require('./lib/messages')
const { writeTargets } = require('./lib/shell')

const HUMAN_ONLY = /tdd\.js["']?\s+(approve|off)\b/

const input = readInput()
const command = input && input.tool_input && input.tool_input.command
if (!command) process.exit(EXIT_ALLOW)
const root = projectRoot(input)
if (!isTddProject(root)) process.exit(EXIT_ALLOW)
const config = loadConfig(root)

const humanOnly = HUMAN_ONLY.exec(command)
if (humanOnly) {
  block(explain({
    rule: `tdd.js ${humanOnly[1]} is reserved for the human.`,
    why: humanOnly[1] === 'approve'
      ? 'approving the test list is the human checkpoint before the first test.'
      : 'turning the guard off is the human\'s decision, not a way out of a blocked phase.',
    action: `ask the human to run /tdd:${humanOnly[1]}.`,
  }), config)
}

const { phase } = loadState(root)
const insideProject = (target) => {
  const rel = path.relative(root, target)
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

// A directory target (rm -rf test/, git checkout -- .) stands for every file below it.
function filesAt(target, limit = 5000) {
  let stat
  try { stat = fs.statSync(target) } catch { return [target] }
  if (!stat.isDirectory()) return [target]
  const found = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (found.length >= limit) return
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else found.push(full)
    }
  }
  walk(target)
  return found
}

for (const target of writeTargets(command, input.cwd || root).filter(insideProject)) {
  for (const file of filesAt(target)) {
    const lesson = forbiddenWrite(phase, classify(file, root, config))
    if (lesson) block(explain({ ...lesson, rule: `${lesson.rule} (through Bash: ${relativeTo(root, file)})` }), config)
  }
}
process.exit(EXIT_ALLOW)
