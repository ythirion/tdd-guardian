'use strict'
const fs = require('node:fs')
const path = require('node:path')

const EXIT_ALLOW = 0
const EXIT_BLOCK = 2

// Hook JSON from stdin. Unreadable input lets the tool through: the plugin must never
// break a session it does not understand.
function readInput() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8')) } catch { return null }
}

function projectRoot(input) {
  return process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd()
}

const isTddProject = (root) => fs.existsSync(path.join(root, '.tdd'))

module.exports = { readInput, projectRoot, isTddProject, EXIT_ALLOW, EXIT_BLOCK }
