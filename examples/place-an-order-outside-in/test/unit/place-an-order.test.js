'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { PlaceOrder } = require('../../src/place-an-order')
const { InMemoryOrders } = require('../fakes/in-memory-orders')
const { anOrder } = require('../builders/order-builder')

describe('Place an order', () => {
  it('saves the order', async () => {
    const orders = new InMemoryOrders()
    const order = anOrder().build()

    await new PlaceOrder(orders).handle(order)

    assert.deepEqual(orders.saved(), [order])
  })
})
