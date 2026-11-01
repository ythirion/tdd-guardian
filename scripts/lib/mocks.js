'use strict'

// Lines of `after` that were not in `before` (multiset difference, order kept).
function addedLines(before, after) {
  const remaining = new Map()
  for (const line of before.split(/\r?\n/)) remaining.set(line, (remaining.get(line) || 0) + 1)
  const added = []
  after.split(/\r?\n/).forEach((text, index) => {
    const left = remaining.get(text) || 0
    if (left > 0) remaining.set(text, left - 1)
    else added.push({ line: index + 1, text })
  })
  return added
}

const JUSTIFICATION = /tdd-guardian:\s*allow-mock\b(.*)$/

function reasonOn(text = '') {
  const match = JUSTIFICATION.exec(text)
  return match ? match[1].replace(/\s*(\*\/|-->)\s*$/, '').trim() : ''
}

// New mock lines, each with the reason written on the same or the previous line.
function findNewMocks(before, after, mockPatterns) {
  const regexps = mockPatterns.map((source) => new RegExp(source))
  const lines = after.split(/\r?\n/)
  return addedLines(before, after)
    .filter(({ text }) => regexps.some((r) => r.test(text)))
    .map((mock) => {
      const reason = reasonOn(mock.text) || reasonOn(lines[mock.line - 2])
      return { ...mock, justified: reason !== '', reason }
    })
}

module.exports = { findNewMocks, addedLines }
