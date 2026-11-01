'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { anOrder } = require('../builders/order-builder')

// The Orders port contract, run against the Fake and every real adapter: a Fake must not lie.
function ordersContract(name, makeOrders) {
  describe(`${name} honours the Orders contract`, () => {
    it('finds a saved order by id', async () => {
      const orders = await makeOrders()
      const order = anOrder().worth(60).build()

      await orders.save(order)

      const found = await orders.byId(order.id)
      assert.equal(found.id, order.id)
      assert.equal(found.total, 60)
    })
  })
}

module.exports = { ordersContract }
