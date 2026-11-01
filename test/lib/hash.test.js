'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { aProject, writeFile } = require('../helpers')
const { loadConfig } = require('../../scripts/lib/config')
const { hashTestCode } = require('../../scripts/lib/hash')

const aShop = () => aProject({
  'src/shipping.ts': 'export const fees = () => 0',
  'test/shipping.test.ts': "it('is free', () => expect(fees()).toBe(0))",
  'test/fakes/in-memory-orders.ts': 'export class InMemoryOrders {}',
  'test/builders/order-builder.ts': 'export const anOrder = () => ({})',
})

describe('Test code hash', () => {
  it('is stable, changes with any test, Fake or builder byte, and ignores production code', () => {
    const root = aShop()
    const initial = hashTestCode(root, loadConfig(root))
    const after = (file, content) => { writeFile(root, file, content); return hashTestCode(root, loadConfig(root)) }

    assert.match(initial, /^sha256:[0-9a-f]{64}$/)
    assert.equal(hashTestCode(root, loadConfig(root)), initial)
    assert.equal(after('src/shipping.ts', 'export const fees = () => 5'), initial)
    assert.notEqual(after('test/fakes/in-memory-orders.ts', 'export class InMemoryOrders { }'), initial)
    const withFakeChanged = hashTestCode(root, loadConfig(root))
    assert.notEqual(after('test/builders/order-builder.ts', 'export const anOrder = () => ({ })'), withFakeChanged)
    const withBuilderChanged = hashTestCode(root, loadConfig(root))
    assert.notEqual(after('test/shipping.test.ts', "it('is free', () => expect(fees()).toBe(1))"), withBuilderChanged)
  })
})
