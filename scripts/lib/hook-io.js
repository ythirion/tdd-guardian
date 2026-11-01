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

// Blocks with the lesson on stderr (fed back to Claude), or only warns when strict is false.
function block(lessonText, config) {
  if (config && config.strict === false) {
    process.stderr.write(`tdd-guardian: warning (strict: false), not blocking:\n${lessonText}\n`)
    process.exit(EXIT_ALLOW)
  }
  process.stderr.write(lessonText + '\n')
  process.exit(EXIT_BLOCK)
}

// Stop hooks block through stdout JSON, exit 0: Claude Code and GitHub Copilot both read this form.
function blockStop(lessonText, config) {
  if (config && config.strict === false) {
    process.stderr.write(`tdd-guardian: warning (strict: false), not blocking:\n${lessonText}\n`)
    process.exit(EXIT_ALLOW)
  }
  process.stdout.write(JSON.stringify({ decision: 'block', reason: lessonText }) + '\n')
  process.exit(EXIT_ALLOW)
}

module.exports = { readInput, projectRoot, isTddProject, block, blockStop, EXIT_ALLOW, EXIT_BLOCK }
