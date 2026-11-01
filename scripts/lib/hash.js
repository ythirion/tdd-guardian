'use strict'
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { filesOfKind } = require('./files')

// Every test-code file (unit tests, Fakes, test support, acceptance tests): taken on
// entering GREEN and compared on leaving it, so even a bypass of the hooks is caught.
function hashTestCode(root, config) {
  const hash = crypto.createHash('sha256')
  for (const file of filesOfKind(root, config, ['test', 'acceptance'])) {
    hash.update(file).update('\0').update(fs.readFileSync(path.join(root, file))).update('\0')
  }
  return `sha256:${hash.digest('hex')}`
}

module.exports = { hashTestCode }
