'use strict'
const assert = require('node:assert/strict')

// Business assertions on an order, chained: theOrder(saved).isShippedFreeOfCharge()
const theOrder = (order) => ({
  isShippedFreeOfCharge() {
    assert.equal(order.shippingFees, 0)
    return this
  },
  costsShipping(amount) {
    assert.equal(order.shippingFees, amount)
    return this
  },
})

module.exports = { theOrder }
