# Test list: place an order

Mode: outside-in. The list opens with the non-passing case, to decide first how a failure is
reported (an error as a value, not an exception). Each scenario and item says what it drives.

- [x] Scenario: an order without lines is refused, and nothing is saved
      Given an order without lines When it is placed Then it is refused and nothing is saved
      → drives: the use case and its signature: a refusal is a value (Placement.Refused), not an exception
  - [x] an order without lines is refused
        → drives: PlaceOrder, the Orders port and its Fake, Placement (fake it: always refuse)
- [x] Scenario: an order above 50 euros is saved with free shipping
      Given an order worth 60 euros When it is placed Then it is saved with no shipping fees
      → drives: saving through the Orders port, and the shipping fees of an order
  - [x] an order with lines is placed and saved
        → drives: the refusal becomes a condition; the order is saved and Placed is returned
  - [x] shipping is free above 50 euros
        → drives: Order.shippingFees (fake it: 0)
- [x] Scenario: an order below 50 euros is saved with 5 euros of shipping
      Given an order worth 30 euros When it is placed Then it is saved with 5 euros of shipping fees
      → drives: the shipping rule itself
  - [x] shipping costs 5 euros below 50 euros
        → drives: the threshold: the fake 0 becomes total > 50 ? 0 : 5, then named constants
  - [x] orders saved in a file honour the Orders contract
        → drives: the real adapter FileOrders, checked by the same contract test as the Fake
