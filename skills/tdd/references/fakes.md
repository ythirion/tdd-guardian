# Fakes over mocks

A **Fake** is a small, working, in-memory implementation of a port, written once and reused across
tests. Tests then assert on state and outcomes, not on calls.

## Where Fakes live

In `fakePatterns` (default `test/fakes/**`). They are test code: written in RED (or REFACTOR),
read-only in GREEN, part of the test-code hash.

## Writing a Fake

- The **smallest working implementation** of the port: a `Map`, an array, a counter.
- **Inspection helpers** in the domain language so tests can read the outcome: `saved()`,
  `sentEmails()`, `publishedEvents()`.
- **No assertions inside the Fake**: it records, the test asserts.
- Deterministic: fixed clock (`() => NOW`), sequential ids.

```ts
// test/fakes/in-memory-orders.ts
export class InMemoryOrders implements Orders {
  private readonly orders = new Map<string, Order>()
  async save(order: Order) { this.orders.set(order.id, order) }
  async byId(id: string) { return this.orders.get(id) }
  saved(): Order[] { return [...this.orders.values()] }
}

export class RecordingMailer implements ConfirmationSender {
  private readonly sent: Email[] = []
  async send(email: Email) { this.sent.push(email) }
  sentEmails() { return [...this.sent] }
}
```

```ts
it('saves an order worth 60 euros with no shipping fees', async () => {
  const orders = new InMemoryOrders()

  await new PlaceOrder(orders).handle(anOrder().worth(60).build())

  theOrder(orders.saved()[0]).isShippedFreeOfCharge()
})
```

## Contract tests: the Fake must not lie

A Fake that behaves differently from the real adapter makes tests pass for code that fails in
production. One shared test suite describes the port's contract and runs against both:

```ts
// test/contracts/orders-contract.ts
export function ordersContract(name: string, makeOrders: () => Promise<Orders>) {
  describe(`${name} honours the Orders contract`, () => {
    it('finds a saved order by id', async () => {
      const orders = await makeOrders()
      const order = anOrder().build()

      await orders.save(order)

      expect(await orders.byId(order.id)).toEqual(order)
    })
    it('finds nothing for an unknown id', async () => {
      expect(await (await makeOrders()).byId('unknown')).toBeUndefined()
    })
  })
}

ordersContract('InMemoryOrders', async () => new InMemoryOrders())
ordersContract('PostgresOrders', async () => PostgresOrders.forTests()) // when the adapter exists
```

## When a mock is still acceptable

- **Stubs** returning canned values for simple queries are tolerated.
- An **interaction mock** (`jest.fn` with call assertions, `Mockito.verify`, `assert_called_with`)
  only when no port exists: a third-party SDK you cannot wrap yet, legacy code with no seam.
- Under `mockPolicy: justify`, write the reason on the same or previous line:

```ts
// tdd-guard: allow-mock payment SDK has no port yet, wrap it in PaymentGateway next
const charge = jest.fn()
```

Justified mocks are listed by `/tdd:status`; each one is a candidate for a port and a Fake later.
Under `mockPolicy: forbid`, even a justified mock is blocked.

## Mock patterns detected by default

Jest (`jest.fn/mock/spyOn`), Vitest (`vi.fn/mock/spyOn`), Sinon (`sinon.mock/stub/spy`), node:test
(`mock.fn/method`), Mockito (`Mockito.mock/verify/when`, `@Mock`, `verify(`), unittest.mock
(`Mock(`, `MagicMock(`, `patch(`, `assert_called*`), Moq (`new Mock<`), NSubstitute
(`Substitute.For<`). Change them with `mockPatterns` in `.tdd/config.json`.
