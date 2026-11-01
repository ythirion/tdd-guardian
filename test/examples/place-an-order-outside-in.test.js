'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { session, MAVEN_MISSING } = require('./replay')

const J = 'src/main/java/shop'
const T = 'src/test/java/shop'
const FILES = {
  acceptance: `${T}/acceptance/PlaceAnOrderAcceptanceTest.java`,
  fake: `${T}/fakes/InMemoryOrders.java`,
  builder: `${T}/builders/OrderBuilder.java`,
  assertions: `${T}/assertions/OrderAssertions.java`,
  contract: `${T}/contracts/OrdersContract.java`,
  placeAnOrderTest: `${T}/unit/PlaceAnOrderTest.java`,
  shippingFeesTest: `${T}/unit/ShippingFeesOfAnOrder.java`,
  inMemoryContractTest: `${T}/unit/InMemoryOrdersContractTest.java`,
  fileContractTest: `${T}/unit/FileOrdersContractTest.java`,
  order: `${J}/Order.java`,
  orderLine: `${J}/OrderLine.java`,
  orders: `${J}/Orders.java`,
  placeOrder: `${J}/PlaceOrder.java`,
  fileOrders: `${J}/FileOrders.java`,
}

// Earlier versions, derived from the final files by removing what later cycles added.
const without = (text, ...pieces) => pieces.reduce((t, piece) => {
  assert.ok(typeof piece === 'string' ? t.includes(piece) : piece.test(t), `version piece ${piece}`)
  return t.replace(piece, '')
}, text)
const TEST_METHOD = (name) => new RegExp(`\\n    @Test\\n    void ${name}\\(\\)[\\s\\S]*?\\n    }\\n`)
const ACCEPTANCE_1 = (final) => without(final, 'import static shop.assertions.OrderAssertions.theOrder;\n',
  'import static shop.builders.OrderBuilder.aBigOrder;\n', 'import static shop.builders.OrderBuilder.aSmallOrder;\n',
  TEST_METHOD('savesAnOrderAbove50EurosWithFreeShipping'), TEST_METHOD('savesAnOrderBelow50EurosWith5EurosOfShipping'))
const ACCEPTANCE_2 = (final) => without(final, 'import static shop.builders.OrderBuilder.aSmallOrder;\n',
  TEST_METHOD('savesAnOrderBelow50EurosWith5EurosOfShipping'))
const PLACE_AN_ORDER_1 = (final) => without(final, 'import shop.Order;\n', 'import shop.Placement.Placed;\n',
  TEST_METHOD('savesAnOrderWithLines'))
const BUILDER_1 = (final) => without(final, /\n    \/\/ Object Mothers[\s\S]*?(?=\n    public OrderBuilder withoutLines)/)
const BUILDER_2 = (final) => without(final, /\n    public static OrderBuilder aSmallOrder\(\) \{[\s\S]*?\n    }\n/)
const ASSERTIONS_1 = (final) => without(final, /\n    public OrderAssertions costsShipping[\s\S]*?\n    }\n/)
const SHIPPING_1 = (final) => without(final, 'import static shop.builders.OrderBuilder.aSmallOrder;\n',
  TEST_METHOD('are5EurosBelow50Euros'))
const FAKE_1 = (final) => without(final, 'import java.util.Optional;\n', /\n    @Override\n    public Optional<Order> byId[\s\S]*?\n    }\n/)
const ORDERS_1 = (final) => without(final, 'import java.util.Optional;\n\n', '\n    Optional<Order> byId(String id);\n')

const PLACE_ORDER_1 = `package shop;

import shop.Placement.Refused;

public final class PlaceOrder {
    private final Orders orders;

    public PlaceOrder(Orders orders) {
        this.orders = orders;
    }

    public Placement handle(Order order) {
        return new Refused("an order needs at least one line");
    }
}
`
const ORDER_1 = `package shop;

import java.util.List;

public record Order(String id, List<OrderLine> lines, String country) {
}
`
const ORDER_2 = `package shop;

import java.util.List;

public record Order(String id, List<OrderLine> lines, String country) {
    public int shippingFees() {
        return 0;
    }
}
`
const ORDER_3 = `package shop;

import java.util.List;

public record Order(String id, List<OrderLine> lines, String country) {
    public int total() {
        return lines.stream().mapToInt(line -> line.price() * line.quantity()).sum();
    }

    public int shippingFees() {
        return total() > 50 ? 0 : 5;
    }
}
`

describe('Example: place an order in Java, outside-in', () => {
  it('opens with the refusal scenario, then runs the double loop with a Fake, a builder, business assertions and a shared contract test', { skip: MAVEN_MISSING }, () => {
    const s = session('place-an-order-outside-in')
    const final = (key) => s.final(FILES[key])
    const write = (key, content = final(key)) => s.write(FILES[key], content)
    const listPath = path.join(s.root, '.tdd/test-list.md')
    const listNow = () => fs.readFileSync(listPath, 'utf8')

    // The list as approved: the scenarios only. Unit examples are added as discovered.
    const finalList = s.final('.tdd/test-list.md')
    const isUnitItem = (line) => /^ {2}- \[/.test(line)
    const isItemDetail = (line) => /^ {8}\S/.test(line)
    const blockOf = (item) => {
      const lines = finalList.split('\n')
      const start = lines.findIndex((line) => isUnitItem(line) && line.endsWith(`] ${item}`))
      let end = start + 1
      while (isItemDetail(lines[end])) end++
      return lines.slice(start, end).join('\n').replace('[x]', '[ ]')
    }
    const scenariosOnly = finalList.split('\n')
      .filter((line, i, lines) => !isUnitItem(line) && !(isItemDetail(line) && lines.slice(0, i).reverse().find((l) => !isItemDetail(l)).match(/^ {2}- \[/)))
      .join('\n').replace(/\[x\]/g, '[ ]')
    const addItems = (scenario, items) => {
      const lines = listNow().split('\n')
      let end = lines.findIndex((line) => line.includes(scenario)) + 1
      while (end < lines.length && lines[end] !== '' && !/^- \[/.test(lines[end])) end++
      lines.splice(end, 0, ...items.map(blockOf))
      s.write('.tdd/test-list.md', lines.join('\n'))
    }
    const scenario = (n) => [...finalList.matchAll(/^- \[x\] (Scenario: .+)$/gm)][n][1]

    assert.equal(s.tdd('start', 'place an order').code, 0)
    s.write('.tdd/test-list.md', scenariosOnly)
    s.human('/tdd:approve')
    assert.equal(s.phase(), 'ACCEPTANCE')

    // Scenario 1, the non-passing case: it decides that a refusal is a value, before any happy path.
    s.blocked(FILES.fake, FAKE_1(final('fake')), /ACCEPTANCE/)
    write('acceptance', ACCEPTANCE_1(final('acceptance')))
    s.next('RED')

    // Cycle A: the use case, its Orders port with a Fake, and Placement. Fake it: always refuse.
    addItems(scenario(0), ['no lines → Refused("an order needs at least one line")'])
    s.blocked(FILES.placeAnOrderTest, 'class PlaceAnOrderTest {\n    Orders orders = Mockito.mock(Orders.class);\n    @Test void refuses() {}\n}', /Fake/)
    write('fake', FAKE_1(final('fake')))
    write('builder', BUILDER_1(final('builder')))
    write('placeAnOrderTest', PLACE_AN_ORDER_1(final('placeAnOrderTest')))
    s.next('GREEN')
    write('orderLine')
    write('order', ORDER_1)
    write('orders', ORDERS_1(final('orders')))
    s.write(`${J}/Placement.java`, s.final(`${J}/Placement.java`))
    write('placeOrder', PLACE_ORDER_1)
    s.next('REFACTOR')
    s.tick('no lines → Refused("an order needs at least one line")')
    s.next('ACCEPTANCE')
    assert.match(listNow(), new RegExp(`- \\[x\\] ${scenario(0)}`))

    // Scenario 2: free shipping above 50 euros.
    write('acceptance', ACCEPTANCE_2(final('acceptance')))
    s.next('RED')

    // Cycle B: the refusal becomes a condition; an order with lines is saved.
    addItems(scenario(1), ['an order with lines → Placed(id), saved', '60 € → shipping 0 €'])
    write('placeAnOrderTest')
    s.next('GREEN')
    write('placeOrder')
    s.next('REFACTOR')
    s.tick('an order with lines → Placed(id), saved')
    assert.match(s.next('RED').out, /acceptance test still red/)

    // Cycle C: free shipping, asserted through a business assertion. Fake it: 0.
    write('builder', BUILDER_2(final('builder')))
    write('assertions', ASSERTIONS_1(final('assertions')))
    write('shippingFeesTest', SHIPPING_1(final('shippingFeesTest')))
    s.next('GREEN')
    write('order', ORDER_2)
    s.next('REFACTOR')
    s.tick('60 € → shipping 0 €')
    s.next('ACCEPTANCE')

    // Scenario 3: 5 euros of shipping below 50 euros.
    write('acceptance')
    s.next('RED')

    // Cycle D: paid shipping triangulates the fake 0; the constants are named in REFACTOR.
    addItems(scenario(2), ['30 € → shipping 5 €: free above 50 € only'])
    write('builder')
    write('assertions')
    write('shippingFeesTest')
    s.next('GREEN')
    write('order', ORDER_3)
    s.next('REFACTOR')
    write('order')
    s.tick('30 € → shipping 5 €: free above 50 € only')
    addItems(scenario(2), ['FileOrders: save(order) then byId(id) → the same order (Orders contract)'])
    s.next('RED')

    // Cycle E: the real adapter, checked by the same contract test as the Fake.
    write('fake')
    write('contract')
    write('inMemoryContractTest')
    write('fileContractTest')
    s.next('GREEN')
    write('orders')
    write('fileOrders')
    s.next('REFACTOR')
    s.tick('FileOrders: save(order) then byId(id) → the same order (Orders contract)')
    s.next('OFF')

    s.assertSameFilesAsExample(['src'])
    assert.equal(listNow(), finalList)
  })
})
