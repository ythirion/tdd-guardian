'use strict'

// Use case: place an order. It depends on the Orders port only, never on an adapter.
class PlaceOrder {
  constructor(orders) {
    this.orders = orders
  }

  async handle(order) {
    await this.orders.save(order)
  }
}

module.exports = { PlaceOrder }
