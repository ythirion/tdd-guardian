# Example: place an order, outside-in (Java)

A use case built with the double loop: one red acceptance test per scenario, unit cycles until it
turns green. `test/examples/place-an-order-outside-in.test.js` replays the whole session through the
real hooks and Maven, and checks that it ends with exactly these files.

```sh
mvn test                # unit suite: acceptance tests are neither compiled nor run
mvn test -Pacceptance   # acceptance suite
```

## What it shows

- **The first scenario is the non-passing case**: an order without lines is refused and nothing is
  saved. It decides how the use case reports a refusal before any happy path exists:
  `PlaceOrder.handle` returns a `Placement` (`Placed` or `Refused`), an error as a value, not an
  exception.
- **Every scenario and item says what it drives** (`→ drives:` in `.tdd/test-list.md`). Unit items
  are added under their scenario as collaborators are discovered.
- **A Fake, not a mock**: `InMemoryOrders` implements the `Orders` port and exposes `saved()`. A
  `Mockito.mock(Orders.class)` attempt is blocked in RED with a message suggesting a Fake.
- **A shared contract test**: `OrdersContract` runs against the Fake and the real `FileOrders`
  adapter, so the Fake cannot lie.
- **Test data builders and Object Mothers**: `anOrder()`, `aBigOrder()`, `aSmallOrder()`.
- **Business assertions**: `theOrder(saved).isShippedFreeOfCharge()`, `.costsShipping(5)`, counted
  as assertions through `assertionMethodPatterns`.

The pom excludes `**/acceptance/**` from test compilation by default, so a red acceptance test that
does not compile yet never blocks the inner loop; the `acceptance` profile compiles and runs it.
