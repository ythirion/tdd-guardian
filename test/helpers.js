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


// ---- Hook drivers ---------------------------------------------------------
const { spawnSync } = require('node:child_process')
const SCRIPTS = path.join(__dirname, '..', 'scripts')

// Runs a hook script as Claude Code does: JSON on stdin, verdict in exit code + stderr.
function runHook(script, payload, env = {}) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const result = spawnSync(process.execPath, [path.join(SCRIPTS, script)], {
    input, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '', ...env },
  })
  return { code: result.status, stderr: result.stderr, stdout: result.stdout }
}

const GREEN_SUITE = 'node -e "process.exit(0)"'
const RED_SUITE = 'node -e "process.exit(1)"'

// A project in a given phase. Config keys default to the spec's TypeScript layout.
function aTddProject({ phase = 'OFF', mode = 'inside-out', config = {}, state = {}, files = {} } = {}) {
  return aProject({
    '.tdd/config.json': {
      testFilePatterns: ['**/*.test.ts', 'test/**'],
      testCommand: GREEN_SUITE,
      acceptanceCommand: RED_SUITE,
      mockPatterns: ['jest\\.fn\\(', 'jest\\.mock\\('],
      ...config,
    },
    '.tdd/state.json': { mode, phase, feature: 'shipping fees', justifiedMocks: [], touchedFiles: [], ...state },
    ...files,
  })
}

const toolCall = (root, tool_name, tool_input) =>
  ({ hook_event_name: 'PreToolUse', cwd: root, tool_name, tool_input })
const aWrite = (root, file, content) => toolCall(root, 'Write', { file_path: path.join(root, file), content })
const anEdit = (root, file, old_string, new_string) =>
  toolCall(root, 'Edit', { file_path: path.join(root, file), old_string, new_string })

// The phase CLI as a human runs it from a terminal: no agent marker (CLAUDECODE, COPILOT_CLI) in the environment.
function tdd(root, args, env = {}) {
  const cleanEnv = { ...process.env, CLAUDE_PROJECT_DIR: '', ...env }
  for (const marker of ['CLAUDECODE', 'COPILOT_CLI']) if (!(marker in env)) delete cleanEnv[marker]
  const result = spawnSync(process.execPath, [path.join(SCRIPTS, 'tdd.js'), ...args], { cwd: root, encoding: 'utf8', env: cleanEnv })
  return { code: result.status, out: `${result.stdout}${result.stderr}` }
}

module.exports = { tdd, aProject, writeFile, readJson, runHook, aTddProject, toolCall, aWrite, anEdit, GREEN_SUITE, RED_SUITE }
