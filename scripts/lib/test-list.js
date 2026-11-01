'use strict'
const fs = require('node:fs')
const path = require('node:path')

const listPath = (root) => path.join(root, '.tdd', 'test-list.md')

const ORDERING = `One item = one precise example, "input → outcome", then the rule it shows if not obvious.
Order them so that each example forces one more piece of code: the list grows the thinnest
complete implementation. Start with the non-passing case: it decides how a refusal is returned,
as a value (Optional.empty(), Refused, Either), not an exception. Tag a rule over a range of
inputs [property]. No code here. Waiting for a human to run /tdd:approve.`

const SKELETONS = {
  'inside-out': (feature) => `# Test list: ${feature}

Mode: inside-out, from the core rules outwards.
${ORDERING}

- [ ] <refused input> → <refused, e.g. Optional.empty()>
- [ ] <simplest accepted input> → <outcome>
- [ ] <next input> → <outcome>: <the rule it forces>
`,
  'outside-in': (feature) => `# Test list: ${feature}

Mode: outside-in. One "Scenario:" per acceptance test; its unit examples go indented below it,
added as collaborators are discovered.
${ORDERING}

- [ ] Scenario: <refused request> → <refused, e.g. Optional.empty() or Refused>, nothing changes
- [ ] Scenario: <request> → <outcome>
`,
}

function writeSkeleton(root, feature, mode) {
  if (fs.existsSync(listPath(root))) return false
  fs.mkdirSync(path.dirname(listPath(root)), { recursive: true })
  fs.writeFileSync(listPath(root), SKELETONS[mode](feature))
  return true
}

const ITEM = /^(\s*)[-*] \[([ xX])\] (.+?)\s*$/

// Checkbox lines of the list. "Scenario:" items are acceptance scenarios, the others unit items.
function readItems(root) {
  if (!fs.existsSync(listPath(root))) return []
  return fs.readFileSync(listPath(root), 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = ITEM.exec(line)
    if (!match) return []
    const text = match[3]
    return [{ text, done: match[2] !== ' ', scenario: /^scenario\s*:/i.test(text) }]
  })
}

const unitItems = (items) => items.filter((item) => !item.scenario)
const scenarios = (items) => items.filter((item) => item.scenario)
const firstOpen = (items) => (items.find((item) => !item.done) || {}).text

// Ticks one item; used by tdd.js for a scenario whose acceptance test it saw green.
function tick(root, text) {
  const lines = fs.readFileSync(listPath(root), 'utf8').split('\n')
  const index = lines.findIndex((line) => { const m = ITEM.exec(line); return m && m[3] === text })
  if (index === -1) return
  lines[index] = lines[index].replace('[ ]', '[x]')
  fs.writeFileSync(listPath(root), lines.join('\n'))
}

module.exports = { listPath, writeSkeleton, readItems, unitItems, scenarios, firstOpen, tick }
