'use strict'
const fs = require('node:fs')
const path = require('node:path')

const listPath = (root) => path.join(root, '.tdd', 'test-list.md')

const SKELETONS = {
  'inside-out': (feature) => `# Test list: ${feature}

Mode: inside-out. Unit cases in business language, from the core rules outwards, simplest first.
Tag an item [property] when it states a rule over a range of inputs. No code here.
Waiting for a human to run /tdd:approve.

- [ ] <simplest core rule>
`,
  'outside-in': (feature) => `# Test list: ${feature}

Mode: outside-in. One "Scenario:" per acceptance test (Given/When/Then); the unit items it needs
are indented below it and added as collaborators are discovered. No code here.
Waiting for a human to run /tdd:approve.

- [ ] Scenario: <name>
      Given <context> When <action> Then <outcome>
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
