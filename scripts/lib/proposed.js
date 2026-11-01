'use strict'
const fs = require('node:fs')

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

module.exports = { proposedContent }
