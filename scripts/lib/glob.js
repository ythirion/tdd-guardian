'use strict'

const cache = new Map()

// Glob to RegExp, .gitignore flavour:
// `**/` any folders (or none), `/**` everything below, `*` within one segment,
// a pattern with no `/` matches the file name at any depth.
function toRegExp(pattern) {
  if (cache.has(pattern)) return cache.get(pattern)
  const anchored = pattern.includes('/') ? pattern.replace(/^\.\//, '') : `**/${pattern}`
  let source = ''
  for (let i = 0; i < anchored.length; i++) {
    const c = anchored[i]
    if (anchored.startsWith('**/', i)) { source += '(?:.*/)?'; i += 2 }
    else if (anchored.startsWith('**', i)) { source += '.*'; i += 1 }
    else if (c === '*') source += '[^/]*'
    else if (c === '?') source += '[^/]'
    else source += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  const regexp = new RegExp(`^${source}$`)
  cache.set(pattern, regexp)
  return regexp
}

function matchesAny(relPath, patterns = []) {
  return patterns.some((pattern) => toRegExp(pattern).test(relPath))
}

module.exports = { matchesAny, toRegExp }
