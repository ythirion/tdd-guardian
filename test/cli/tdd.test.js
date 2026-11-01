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

describe('tdd.js approve', () => {
  it('refuses next in LIST: only a human approves the test list', () => {
    const root = aTddProject({ phase: 'LIST' })

    const result = tdd(root, ['next'])

    assert.equal(result.code, REFUSED)
    assert.match(result.out, /\/tdd:approve/)
    assert.equal(phaseOf(root), 'LIST')
  })

  it('inside-out: goes from LIST to RED and records the unit test count', () => {
    const root = aTddProject({ phase: 'LIST', mode: 'inside-out', files: { 'src/a.test.ts': "it('a', () => {})" } })

    const result = tdd(root, ['approve'])

    assert.equal(result.code, OK, result.out)
    assert.equal(phaseOf(root), 'RED')
    assert.equal(readJson(root, '.tdd/state.json').unitTestCountAtRed, 1)
  })
  it('outside-in: goes from LIST to ACCEPTANCE and records the acceptance test count', () => {
    const root = aTddProject({ phase: 'LIST', mode: 'outside-in' })

    assert.equal(tdd(root, ['approve']).code, OK)
    assert.equal(phaseOf(root), 'ACCEPTANCE')
    assert.equal(readJson(root, '.tdd/state.json').acceptanceTestCountAtAcceptance, 0)
  })

  it('refuses approve and off from an agent shell (CLAUDECODE set)', () => {
    const list = aTddProject({ phase: 'LIST' })
    const green = aTddProject({ phase: 'GREEN' })

    const approveByAgent = tdd(list, ['approve'], { CLAUDECODE: '1' })
    const offByAgent = tdd(green, ['off'], { CLAUDECODE: '1' })

    assert.equal(approveByAgent.code, REFUSED)
    assert.match(approveByAgent.out, /human/)
    assert.equal(offByAgent.code, REFUSED)
    assert.equal(phaseOf(list), 'LIST')
    assert.equal(phaseOf(green), 'GREEN')
  })
})
