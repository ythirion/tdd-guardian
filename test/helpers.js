'use strict'
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

// A throwaway project on disk: { 'src/a.ts': '...', '.tdd/config.json': {...} }
function aProject(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tdd-guardian-'))
  for (const [rel, content] of Object.entries(files)) writeFile(root, rel, content)
  return root
}

function writeFile(root, rel, content) {
  const full = path.join(root, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
}

function readJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
}

module.exports = { aProject, writeFile, readJson }
