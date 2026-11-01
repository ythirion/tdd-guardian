'use strict'
const fs = require('node:fs')
const path = require('node:path')

const statePath = (root) => path.join(root, '.tdd', 'state.json')

function loadState(root) {
  const file = statePath(root)
  if (!fs.existsSync(file)) return { phase: 'OFF' }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function saveState(root, state) {
  fs.mkdirSync(path.dirname(statePath(root)), { recursive: true })
  fs.writeFileSync(statePath(root), JSON.stringify(state, null, 2) + '\n')
}

const PHASES = ['OFF', 'LIST', 'ACCEPTANCE', 'RED', 'GREEN', 'REFACTOR']
const MODES = ['inside-out', 'outside-in']

const canChangeMode = (phase) => phase === 'OFF' || phase === 'LIST'

module.exports = { loadState, saveState, statePath, canChangeMode, PHASES, MODES }
