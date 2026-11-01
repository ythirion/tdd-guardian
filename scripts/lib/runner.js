'use strict'
const { spawnSync } = require('node:child_process')

const OUTPUT_TAIL = 2000

function runSuite(command, cwd, { timeoutMs = 10 * 60 * 1000 } = {}) {
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 })
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? String(result.error) : ''}`
  return { green: result.status === 0, exitCode: result.status, output: output.slice(-OUTPUT_TAIL) }
}

module.exports = { runSuite }
