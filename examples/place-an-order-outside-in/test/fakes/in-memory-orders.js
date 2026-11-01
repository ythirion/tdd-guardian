'use strict'
// Fake of the Orders port: a small working in-memory implementation, shared by every test.
class InMemoryOrders {
  constructor() {
    this.orders = new Map()
  }

  async save(order) {
    this.orders.set(order.id, order)
  }

  async byId(id) {
    return this.orders.get(id)
  }

  saved() {
    return [...this.orders.values()]
  }
}

module.exports = { InMemoryOrders }
