'use strict'
// Phase transitions. Every function returns { ok, message } and saves the state on success.
const { loadState, saveState, canChangeMode, MODES } = require('./state')
const fs = require('node:fs')
const path = require('node:path')
const { loadConfig, configPath, detectConfig, DEFAULT_CONFIG } = require('./config')
const { writeSkeleton } = require('./test-list')

const refuse = (message) => ({ ok: false, message })
const done = (root, state, message) => { saveState(root, state); return { ok: true, message } }

// Writes .tdd/config.json from the detected build file. Returns a note for the human to review.
function ensureConfig(root) {
  if (fs.existsSync(configPath(root))) return ''
  const detected = detectConfig(root)
  fs.mkdirSync(path.dirname(configPath(root)), { recursive: true })
  fs.writeFileSync(configPath(root), JSON.stringify(detected ? detected.config : DEFAULT_CONFIG, null, 2) + '\n')
  return `Created .tdd/config.json (${detected ? detected.ecosystem : 'defaults, no build file found'}): `
    + 'review testCommand, acceptanceCommand and the file patterns with the human.\n'
}

const MODE_LOCKED = (phase) => `The mode can only change in OFF or LIST (current phase: ${phase}). `
  + 'Switching strategy mid-cycle would leave the current test without its loop; finish the feature or ask the human to run /tdd:off.'

function start(root, { feature, mode }) {
  const state = loadState(root)
  if (!canChangeMode(state.phase)) return refuse(MODE_LOCKED(state.phase))
  const configNote = ensureConfig(root)
  const config = loadConfig(root)
  const chosenMode = mode || config.defaultMode
  if (!MODES.includes(chosenMode)) return refuse(`Unknown mode "${chosenMode}": use inside-out or outside-in.`)
  writeSkeleton(root, feature, chosenMode)
  return done(root, { ...state, mode: chosenMode, phase: 'LIST', feature, justifiedMocks: [], touchedFiles: [] },
    `${configNote}LIST (${chosenMode}): draft .tdd/test-list.md, then ask the human to run /tdd:approve.`)
}

function setMode(root, mode) {
  const state = loadState(root)
  if (!canChangeMode(state.phase)) return refuse(MODE_LOCKED(state.phase))
  if (!MODES.includes(mode)) return refuse(`Unknown mode "${mode}": use inside-out or outside-in.`)
  return done(root, { ...state, mode }, `Mode set to ${mode}.`)
}

module.exports = { start, setMode }
