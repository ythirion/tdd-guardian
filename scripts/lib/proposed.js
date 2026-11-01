'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { parsePatch, applyHunks } = require('./patch')

const readOrEmpty = (file) => { try { return fs.readFileSync(file, 'utf8') } catch { return '' } }

function applyEdit(content, { old_string = '', new_string = '', replace_all = false }) {
  if (!old_string) return content + new_string
  return replace_all ? content.split(old_string).join(new_string) : content.replace(old_string, () => new_string)
}

// The file as it is on disk and as it would be after the tool call.
function proposedContent(toolName, toolInput, absoluteFile) {
  const before = readOrEmpty(absoluteFile)
  switch (toolName) {
    case 'Write': return { before, after: toolInput.content || '' }
    case 'Edit': return { before, after: applyEdit(before, toolInput) }
    case 'MultiEdit': return { before, after: (toolInput.edits || []).reduce(applyEdit, before) }
    case 'NotebookEdit':
      // Cell-level edit: the new source is appended, which is enough to count tests, markers and mocks.
      return { before, after: toolInput.edit_mode === 'delete' ? before : `${before}\n${toolInput.new_source || ''}` }
    default: return { before, after: before }
  }
}

// Every file a tool call writes, as { file, before, after }. Claude Code tools write one file;
// a GitHub Copilot apply_patch (a string tool_input) can add, update, move or delete several.
function proposedWrites(toolName, toolInput, root) {
  const changes = parsePatch(toolInput)
  if (changes.length === 0) {
    const file = (toolInput && (toolInput.file_path || toolInput.notebook_path)) || ''
    return [{ file, ...proposedContent(toolName, toolInput, path.resolve(root, file)) }]
  }
  return changes.flatMap((change) => {
    const before = readOrEmpty(path.resolve(root, change.path))
    if (change.op === 'add') return [{ file: change.path, before, after: change.content }]
    if (change.op === 'delete') return [{ file: change.path, before, after: '' }]
    const after = applyHunks(before, change.hunks)
    if (!change.moveTo) return [{ file: change.path, before, after }]
    return [{ file: change.path, before, after: '' },
      { file: change.moveTo, before: readOrEmpty(path.resolve(root, change.moveTo)), after }]
  })
}

module.exports = { proposedContent, proposedWrites }
