'use strict'
const { spawnSync } = require('node:child_process')

const OUTPUT_TAIL = 2000

// The project's suite runs in a clean environment: a parent node:test run (NODE_TEST_CONTEXT)
// would otherwise capture a nested `node --test` and hide its exit code.
function suiteEnv() {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  return env
}

function runSuite(command, cwd, { timeoutMs = 10 * 60 * 1000 } = {}) {
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf8', env: suiteEnv(), timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 })
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? String(result.error) : ''}`
  return { green: result.status === 0, exitCode: result.status, output: output.slice(-OUTPUT_TAIL) }
}

module.exports = { runSuite }
