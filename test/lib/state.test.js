'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { aProject } = require('../helpers')
const { loadState, saveState, canChangeMode } = require('../../scripts/lib/state')

describe('Cycle state', () => {
  it('is OFF when the project has never started a TDD session', () => {
    assert.equal(loadState(aProject()).phase, 'OFF')
  })
  it('reads back the state it saved', () => {
    const root = aProject()
    const state = { mode: 'inside-out', phase: 'RED', feature: 'fizzbuzz', justifiedMocks: [], touchedFiles: [] }

    saveState(root, state)

    assert.deepEqual(loadState(root), state)
  })
  it('lets the mode change only in OFF and LIST', () => {
    assert.equal(canChangeMode('OFF'), true)
    assert.equal(canChangeMode('LIST'), true)
    for (const phase of ['ACCEPTANCE', 'RED', 'GREEN', 'REFACTOR']) assert.equal(canChangeMode(phase), false, phase)
  })
})
