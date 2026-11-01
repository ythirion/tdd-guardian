'use strict'
const { spawnSync } = require('node:child_process')

const git = (root, args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' })

// Commits everything; silently skipped outside a git repo or with nothing to commit.
function commitAll(root, message) {
  if (git(root, ['rev-parse', '--is-inside-work-tree']).status !== 0) return 'not a git repository, no commit'
  git(root, ['add', '-A'])
  if (git(root, ['diff', '--cached', '--quiet']).status === 0) return 'nothing to commit'
  const result = git(root, ['commit', '-q', '-m', message])
  return result.status === 0 ? `committed: ${message}` : `commit failed: ${(result.stderr || '').trim()}`
}

const scope = (feature = '') => feature.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// The behaviour lands as feat when GREEN commits are off; otherwise GREEN is feat and REFACTOR is refactor.
function commitMessage(fromPhase, state, config) {
  const subject = `(${scope(state.feature)}): ${state.currentTest}`
  if (fromPhase === 'GREEN' && config.commitOnGreen) return `feat${subject}`
  if (fromPhase === 'REFACTOR' && config.commitOnRefactor) return `${config.commitOnGreen ? 'refactor' : 'feat'}${subject}`
  return null
}

module.exports = { commitAll, commitMessage }
