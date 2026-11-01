'use strict'
// The apply_patch format GitHub Copilot CLI sends as tool_input of its Edit tool:
//   *** Begin Patch
//   *** Add File: <path>        then +lines
//   *** Update File: <path>     optionally *** Move to: <path>, then @@ hunks of ' ', '-', '+' lines
//   *** Delete File: <path>
//   *** End Patch

const HEADER = /^\*\*\* (Add|Update|Delete) File: (.+?)\s*$/
const MOVE = /^\*\*\* Move to: (.+?)\s*$/

function parsePatch(text) {
  if (typeof text !== 'string' || !text.includes('*** Begin Patch')) return []
  const changes = []
  let current = null
  let hunk = null
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('*** End Patch')) break
    const header = HEADER.exec(line)
    if (header) {
      current = { op: header[1].toLowerCase(), path: header[2] }
      if (current.op === 'add') current.content = ''
      if (current.op === 'update') current.hunks = []
      changes.push(current)
      hunk = null
      continue
    }
    if (!current || line.startsWith('*** ')) {
      const move = MOVE.exec(line)
      if (move && current) current.moveTo = move[1]
      continue
    }
    if (current.op === 'add') {
      if (line.startsWith('+')) current.content += `${line.slice(1)}\n`
    } else if (current.op === 'update') {
      if (line.startsWith('@@')) {
        hunk = { old: [], new: [] }
        current.hunks.push(hunk)
        continue
      }
      if (!hunk) { hunk = { old: [], new: [] }; current.hunks.push(hunk) }
      const sign = line[0]
      const body = line.slice(1)
      if (sign === ' ' || sign === undefined) { hunk.old.push(body); hunk.new.push(body) }
      if (sign === '-') hunk.old.push(body)
      if (sign === '+') hunk.new.push(body)
    }
  }
  return changes
}

// Applies the hunks in order. A hunk that cannot be placed has its added lines appended: enough to
// count new tests, markers and mocks, which is all the guardian needs from the proposed content.
function applyHunks(content, hunks) {
  let lines = content.split('\n')
  let from = 0
  for (const hunk of hunks) {
    const at = indexOfBlock(lines, hunk.old, from)
    if (at === -1) {
      const added = hunk.new.filter((line) => !hunk.old.includes(line))
      lines = [...lines.slice(0, -1), ...added, lines[lines.length - 1]]
      continue
    }
    lines = [...lines.slice(0, at), ...hunk.new, ...lines.slice(at + hunk.old.length)]
    from = at + hunk.new.length
  }
  return lines.join('\n')
}

function indexOfBlock(lines, block, from) {
  if (block.length === 0) return lines.length - 1
  for (let i = from; i + block.length <= lines.length; i++) {
    if (block.every((line, j) => lines[i + j] === line)) return i
  }
  return -1
}

module.exports = { parsePatch, applyHunks }
