'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { tdd, aTddProject, aProject, readJson } = require('../helpers')

const phaseOf = (root) => readJson(root, '.tdd/state.json').phase
const OK = 0
const REFUSED = 1

describe('tdd.js start', () => {
  it('enters LIST with the requested mode and drafts a test-list skeleton', () => {
    const root = aTddProject({ phase: 'OFF' })

    const result = tdd(root, ['start', 'fizzbuzz', '--mode', 'inside-out'])

    assert.equal(result.code, OK, result.out)
    const state = readJson(root, '.tdd/state.json')
    assert.equal(state.phase, 'LIST')
    assert.equal(state.mode, 'inside-out')
    assert.equal(state.feature, 'fizzbuzz')
    assert.match(fs.readFileSync(path.join(root, '.tdd/test-list.md'), 'utf8'), /# Test list: fizzbuzz/)
  })
  it('uses defaultMode without --mode, and creates the config from the detected build file', () => {
    const root = aProject({ 'package.json': '{"name":"shop"}' })

    const result = tdd(root, ['start', 'shipping', 'fees'])

    assert.equal(result.code, OK, result.out)
    assert.equal(readJson(root, '.tdd/state.json').mode, 'outside-in')
    assert.equal(readJson(root, '.tdd/state.json').feature, 'shipping fees')
    assert.match(readJson(root, '.tdd/config.json').testCommand, /^npm test/)
    assert.match(result.out, /Created \.tdd\/config\.json \(node\)/)
  })
  it('refuses to change the mode outside OFF and LIST, and allows it in LIST', () => {
    const red = aTddProject({ phase: 'RED', mode: 'inside-out' })
    const list = aTddProject({ phase: 'LIST', mode: 'inside-out' })

    const refused = tdd(red, ['mode', 'outside-in'])
    assert.equal(refused.code, REFUSED)
    assert.match(refused.out, /mode can only change in OFF or LIST/)
    assert.equal(tdd(red, ['start', 'other', '--mode', 'outside-in']).code, REFUSED)
    assert.equal(readJson(red, '.tdd/state.json').mode, 'inside-out')

    assert.equal(tdd(list, ['mode', 'outside-in']).code, OK)
    assert.equal(readJson(list, '.tdd/state.json').mode, 'outside-in')
  })
})
