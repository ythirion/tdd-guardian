# Example: place an order, outside-in

The result of a full TDD Guardian session in outside-in mode: two acceptance scenarios, each driving
inner unit cycles, with Fakes instead of mocks.

- `test/acceptance/`: one acceptance test per scenario, at the use case boundary.
- `test/fakes/in-memory-orders.js`: the Fake of the `Orders` port, with an inspection helper `saved()`.
- `test/builders/order-builder.js`: `anOrder()` with domain defaults, and Object Mothers `aBigOrder()`, `aSmallOrder()`.
- `test/assertions/order-assertions.js`: business assertions, `theOrder(saved).isShippedFreeOfCharge()`.
- `test/contracts/orders-contract.js`: the `Orders` contract, run against the Fake **and** the real
  `JsonFileOrders` adapter (`test/unit/orders.contract.test.js`), so the Fake cannot lie.
- `src/`: the use case `PlaceOrder`, the `Order` with its shipping rule, the JSON file adapter.

`npm test` runs the unit suite, `npm run test:acceptance` the acceptance suite. The plugin's own test
suite replays the session through the hooks and `tdd.js`
(`test/examples/place-an-order-outside-in.test.js`) and checks it produces these exact files.
