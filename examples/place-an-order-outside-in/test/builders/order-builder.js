'use strict'
const { randomUUID } = require('node:crypto')
const { Order } = require('../../src/order')

// The only place that knows the Order constructor. Defaults give a valid order.
class OrderBuilder {
  constructor() {
    this.lines = [{ title: 'Growing Object-Oriented Software', price: 40, quantity: 1 }]
    this.country = 'FR'
  }

  worth(amount) {
    this.lines = [{ title: 'A book', price: amount, quantity: 1 }]
    return this
  }

  build() {
    return new Order(randomUUID(), this.lines, this.country)
  }
}

const anOrder = () => new OrderBuilder()

// Object Mothers: the orders that keep coming back in the shop's examples.
const aBigOrder = () => anOrder().worth(60)
const aSmallOrder = () => anOrder().worth(30)

module.exports = { anOrder, aBigOrder, aSmallOrder }
