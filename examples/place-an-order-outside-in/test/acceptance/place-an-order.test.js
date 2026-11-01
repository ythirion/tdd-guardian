'use strict'
const { describe, it } = require('node:test')
const { PlaceOrder } = require('../../src/place-an-order')
const { InMemoryOrders } = require('../fakes/in-memory-orders')
const { aBigOrder, aSmallOrder } = require('../builders/order-builder')
const { theOrder } = require('../assertions/order-assertions')

describe('Place an order', () => {
  it('saves an order above 50 euros with free shipping', async () => {
    const orders = new InMemoryOrders()

    await new PlaceOrder(orders).handle(aBigOrder().build())

    theOrder(orders.saved()[0]).isShippedFreeOfCharge()
  })

  it('saves an order below 50 euros with 5 euros of shipping', async () => {
    const orders = new InMemoryOrders()

    await new PlaceOrder(orders).handle(aSmallOrder().build())

    theOrder(orders.saved()[0]).costsShipping(5)
  })
})
