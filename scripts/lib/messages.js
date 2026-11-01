'use strict'

// Every block teaches: the rule broken, why it exists, what to do instead.
function explain({ rule, why, action }) {
  return [`tdd-guard: ${rule}`, `Why: ${why}`, `Do instead: ${action}`].join('\n')
}

module.exports = { explain }
