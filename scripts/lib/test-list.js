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

module.exports = { listPath, writeSkeleton }
