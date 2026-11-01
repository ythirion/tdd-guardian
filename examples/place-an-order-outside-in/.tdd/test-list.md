# Test list: place an order

Mode: outside-in. One scenario per acceptance test, its unit examples below: input → outcome.

- [x] Scenario: an order without lines → Refused, nothing saved
  - [x] no lines → Refused("an order needs at least one line")
- [x] Scenario: an order of 60 € → saved, shipping 0 €
  - [x] an order with lines → Placed(id), saved
  - [x] 60 € → shipping 0 €
- [x] Scenario: an order of 30 € → saved, shipping 5 €
  - [x] 30 € → shipping 5 €: free above 50 € only
  - [x] FileOrders: save(order) then byId(id) → the same order (Orders contract)
