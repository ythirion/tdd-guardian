# Example: place an order, outside-in (Java)

```sh
mvn test                # unit suite (acceptance tests are not compiled)
mvn test -Pacceptance   # acceptance suite
```

The test list (`.tdd/test-list.md`): one scenario per acceptance test, its unit examples below.

```
Scenario: an order without lines → Refused, nothing saved
  no lines → Refused("an order needs at least one line")
Scenario: an order of 60 € → saved, shipping 0 €
  an order with lines → Placed(id), saved
  60 € → shipping 0 €
Scenario: an order of 30 € → saved, shipping 5 €
  30 € → shipping 5 €: free above 50 € only
  FileOrders: save(order) then byId(id) → the same order (Orders contract)
```

| Practice | Where |
| --- | --- |
| Refusal as a value, not an exception | `PlaceOrder.handle` → `Placement.Placed` / `Placement.Refused` |
| A Fake, not a mock (a `Mockito.mock` gets blocked) | `fakes/InMemoryOrders`, asserted through `saved()` |
| One contract test, Fake and real adapter | `contracts/OrdersContract` → `InMemoryOrders`, `FileOrders` |
| Builder, Object Mothers | `anOrder()`, `aBigOrder()`, `aSmallOrder()` |
| Business assertions | `theOrder(saved).isShippedFreeOfCharge()`, `.costsShipping(5)` |

`test/examples/place-an-order-outside-in.test.js` replays the session through TDD Guardian's hooks
and Maven.
