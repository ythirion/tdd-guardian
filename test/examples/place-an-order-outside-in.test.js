'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { session } = require('./replay')

// Intermediate versions; the final ones are the example's files.
const ACCEPTANCE_1 = `'use strict'
const { describe, it } = require('node:test')
const { PlaceOrder } = require('../../src/place-an-order')
const { InMemoryOrders } = require('../fakes/in-memory-orders')
const { aBigOrder } = require('../builders/order-builder')
const { theOrder } = require('../assertions/order-assertions')

describe('Place an order', () => {
  it('saves an order above 50 euros with free shipping', async () => {
    const orders = new InMemoryOrders()

    await new PlaceOrder(orders).handle(aBigOrder().build())

    theOrder(orders.saved()[0]).isShippedFreeOfCharge()
  })
})
`
const FAKE_1 = `'use strict'
// Fake of the Orders port: a small working in-memory implementation, shared by every test.
class InMemoryOrders {
  constructor() {
    this.orders = new Map()
  }

  async save(order) {
    this.orders.set(order.id, order)
  }

  saved() {
    return [...this.orders.values()]
  }
}

module.exports = { InMemoryOrders }
`
const BUILDER_1 = (final) => final.replace(/const aSmallOrder = .*\n/, '').replace('{ anOrder, aBigOrder, aSmallOrder }', '{ anOrder, aBigOrder }')
const ASSERTIONS_1 = (final) => final.replace(/\n  costsShipping[\s\S]*?return this\n  },/, '')
const ORDER_1 = `'use strict'

class Order {
  constructor(id, lines, country) {
    this.id = id
    this.lines = lines
    this.country = country
  }
}

module.exports = { Order }
`
const ORDER_2 = ORDER_1.replace('    this.country = country\n  }\n', '    this.country = country\n  }\n\n  get shippingFees() {\n    return 0\n  }\n')
const ORDER_3 = ORDER_1.replace('    this.country = country\n  }\n', `    this.country = country
  }

  get total() {
    return this.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  }

  get shippingFees() {
    return this.total > 50 ? 0 : 5
  }
`)
const UNIT_ORDER_1 = (final) => final.replace(/\n  it\('are 5 euros below[\s\S]*?\}\)\n/, '').replace('{ aBigOrder, aSmallOrder }', '{ aBigOrder }')

const SCENARIO_1 = 'Scenario: an order above 50 euros is saved with free shipping'
const SCENARIO_2 = 'Scenario: an order below 50 euros is saved with 5 euros of shipping'
const LIST = `# Test list: place an order

Mode: outside-in. One scenario per acceptance test; unit items are added below it as collaborators are discovered.

- [ ] ${SCENARIO_1}
      Given an order worth 60 euros When it is placed Then it is saved with no shipping fees
- [ ] ${SCENARIO_2}
      Given an order worth 30 euros When it is placed Then it is saved with 5 euros of shipping fees
`

describe('Example: place an order, outside-in', () => {
  it('runs the double loop end to end with a Fake, a builder, business assertions and a shared contract test', () => {
    const s = session('place-an-order-outside-in')
    const listNow = () => fs.readFileSync(path.join(s.root, '.tdd/test-list.md'), 'utf8')
    const addItems = (afterLine, items) => s.write('.tdd/test-list.md',
      listNow().replace(afterLine, `${afterLine}${items.map((i) => `\n  - [ ] ${i}`).join('')}`))

    assert.equal(s.tdd('start', 'place an order').code, 0)
    s.write('.tdd/test-list.md', LIST)
    s.human('/tdd:approve')
    assert.equal(s.phase(), 'ACCEPTANCE')

    // Outer loop, scenario 1: the acceptance test fails, its collaborators do not exist yet.
    s.blocked('test/fakes/in-memory-orders.js', FAKE_1, /ACCEPTANCE/)
    s.write('test/acceptance/place-an-order.test.js', ACCEPTANCE_1)
    s.next('RED')

    // Inner cycle A: the outermost unit, the use case. The Orders role becomes a port with a Fake.
    addItems('with no shipping fees', ['placing an order saves it', 'shipping is free above 50 euros'])
    s.blocked('test/unit/place-an-order.test.js', "const save = mock.fn()\nit('saves', () => {})", /Fake/)
    s.write('test/fakes/in-memory-orders.js', FAKE_1)
    s.write('test/builders/order-builder.js', BUILDER_1(s.final('test/builders/order-builder.js')))
    s.write('test/unit/place-an-order.test.js', s.final('test/unit/place-an-order.test.js'))
    s.next('GREEN')
    s.write('src/order.js', ORDER_1)
    s.write('src/place-an-order.js', s.final('src/place-an-order.js'))
    s.next('REFACTOR')
    s.tick('placing an order saves it')
    assert.match(s.next('RED').out, /acceptance test still red/)

    // Inner cycle B: free shipping, asserted through a business assertion. Fake it.
    s.write('test/assertions/order-assertions.js', ASSERTIONS_1(s.final('test/assertions/order-assertions.js')))
    s.write('test/unit/order.test.js', UNIT_ORDER_1(s.final('test/unit/order.test.js')))
    s.next('GREEN')
    s.write('src/order.js', ORDER_2)
    s.next('REFACTOR')
    s.tick('shipping is free above 50 euros')
    s.next('ACCEPTANCE')
    assert.match(listNow(), new RegExp(`- \\[x\\] ${SCENARIO_1}`))

    // Outer loop, scenario 2.
    s.write('test/acceptance/place-an-order.test.js', s.final('test/acceptance/place-an-order.test.js'))
    s.next('RED')

    // Inner cycle C: the paid shipping triangulates the fake; constants extracted in REFACTOR.
    addItems('with 5 euros of shipping fees', ['shipping costs 5 euros below 50 euros'])
    s.write('test/builders/order-builder.js', s.final('test/builders/order-builder.js'))
    s.write('test/assertions/order-assertions.js', s.final('test/assertions/order-assertions.js'))
    s.write('test/unit/order.test.js', s.final('test/unit/order.test.js'))
    s.next('GREEN')
    s.write('src/order.js', ORDER_3)
    s.next('REFACTOR')
    s.write('src/order.js', s.final('src/order.js'))
    s.tick('shipping costs 5 euros below 50 euros')
    addItems('  - [x] shipping costs 5 euros below 50 euros', ['orders saved in a JSON file honour the Orders contract'])
    s.next('RED')

    // Inner cycle D: the real adapter, checked by the same contract test as the Fake.
    s.write('test/fakes/in-memory-orders.js', s.final('test/fakes/in-memory-orders.js'))
    s.write('test/contracts/orders-contract.js', s.final('test/contracts/orders-contract.js'))
    s.write('test/unit/orders.contract.test.js', s.final('test/unit/orders.contract.test.js'))
    s.next('GREEN')
    s.write('src/json-file-orders.js', s.final('src/json-file-orders.js'))
    s.next('REFACTOR')
    s.tick('orders saved in a JSON file honour the Orders contract')
    s.next('OFF')

    s.assertSameFilesAsExample(['src', 'test'])
    assert.equal(listNow(), s.final('.tdd/test-list.md'))
  })
})
