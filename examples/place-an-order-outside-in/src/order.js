'use strict'

const FREE_SHIPPING_ABOVE = 50
const STANDARD_SHIPPING = 5

class Order {
  constructor(id, lines, country) {
    this.id = id
    this.lines = lines
    this.country = country
  }

  get total() {
    return this.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  }

  get shippingFees() {
    return this.total > FREE_SHIPPING_ABOVE ? 0 : STANDARD_SHIPPING
  }
}

module.exports = { Order }
