'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { classify } = require('./classify')

const IGNORED_DIRS = new Set(['.git', '.tdd', 'node_modules', 'bin', 'obj', 'target', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'coverage', 'reports', '.stryker-tmp'])

// Project files, relative with forward slashes, sorted so results are stable across OSes.
function listProjectFiles(root) {
  const found = []
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) { if (!IGNORED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), childRel) }
      else if (entry.isFile()) found.push(childRel)
    }
  }
  walk(root, '')
  return found.sort()
}

function filesOfKind(root, config, kinds) {
  return listProjectFiles(root).filter((file) => kinds.includes(classify(file, root, config)))
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8')

module.exports = { listProjectFiles, filesOfKind, read }
