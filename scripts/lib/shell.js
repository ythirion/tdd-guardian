'use strict'
const path = require('node:path')
// Heuristic, not a sandbox: finds the files a shell command would write, delete or restore.

// Shell words, honouring single and double quotes. Operators become their own words.
function words(command) {
  const result = []
  let current = ''
  let quote = null
  let started = false
  const flush = () => { if (started) result.push(current); current = ''; started = false }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (quote) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"' && i + 1 < command.length) current += command[++i]
      else current += c
      continue
    }
    if (c === "'" || c === '"') { quote = c; started = true; continue }
    if (c === '\\' && i + 1 < command.length) { current += command[++i]; started = true; continue }
    if (/\s/.test(c)) { flush(); continue }
    const operator = /^(\d?>>?|&&|\|\||[;|&])/.exec(command.slice(i))
    if (operator && !(operator[1] === '&' && command[i - 1] === '>')) {
      flush(); result.push(operator[1]); i += operator[1].length - 1; continue
    }
    current += c
    started = true
  }
  flush()
  return result
}

const SEPARATORS = new Set(['&&', '||', ';', '|', '&'])

function segments(command) {
  const all = [[]]
  for (const word of words(command)) {
    if (SEPARATORS.has(word)) all.push([])
    else all[all.length - 1].push(word)
  }
  return all.filter((segment) => segment.length > 0)
}

const operands = (args) => args.filter((arg) => !arg.startsWith('-'))

const REDIRECTION = /^\d?>>?$/

// Paths after git checkout/restore: everything after `--`, or the operands that are not a ref.
function gitTargets([subcommand, ...args]) {
  if (!['checkout', 'restore'].includes(subcommand)) return []
  const dashDash = args.indexOf('--')
  if (dashDash !== -1) return args.slice(dashDash + 1)
  const paths = operands(args)
  return subcommand === 'checkout' ? paths.filter((p) => /[./]/.test(p)) : paths
}

const TARGETS_BY_PROGRAM = {
  sed: (args) => (args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith('--in-place')) ? operands(args).slice(1) : []),
  perl: (args) => (args.some((a) => /^-[a-zA-Z]*i/.test(a)) ? operands(args).slice(1) : []),
  tee: (args) => operands(args),
  cp: (args) => operands(args).slice(-1),
  mv: (args) => operands(args),
  rm: (args) => operands(args),
  unlink: (args) => operands(args),
  truncate: (args) => operands(args),
  touch: (args) => operands(args),
  git: gitTargets,
}

// Absolute paths the command would write, following `cd` between segments.
function writeTargets(command, cwd = '.') {
  let dir = cwd
  const targets = []
  for (const segment of segments(command)) {
    const plain = []
    for (let i = 0; i < segment.length; i++) {
      if (REDIRECTION.test(segment[i])) {
        const target = segment[++i]
        if (target && !target.startsWith('&') && target !== '/dev/null') targets.push(path.resolve(dir, target))
      } else plain.push(segment[i])
    }
    const [program, ...args] = plain
    if (!program) continue
    if (program === 'cd') { dir = path.resolve(dir, args[0] || '.'); continue }
    const byProgram = TARGETS_BY_PROGRAM[program.split('/').pop()]
    if (byProgram) targets.push(...byProgram(args).map((target) => path.resolve(dir, target)))
  }
  return targets
}

module.exports = { writeTargets, words, segments }
