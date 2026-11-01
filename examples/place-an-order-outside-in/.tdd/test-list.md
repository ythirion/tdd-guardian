# Test list: place an order

Mode: outside-in. One scenario per acceptance test; unit items are added below it as collaborators are discovered.

- [x] Scenario: an order above 50 euros is saved with free shipping
      Given an order worth 60 euros When it is placed Then it is saved with no shipping fees
  - [x] placing an order saves it
  - [x] shipping is free above 50 euros
- [x] Scenario: an order below 50 euros is saved with 5 euros of shipping
      Given an order worth 30 euros When it is placed Then it is saved with 5 euros of shipping fees
  - [x] shipping costs 5 euros below 50 euros
  - [x] orders saved in a JSON file honour the Orders contract
