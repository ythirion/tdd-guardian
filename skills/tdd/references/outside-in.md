# Outside-in (London school, with Fakes) TDD

Start from a failing acceptance test at the system boundary (use case or API), then drive the inner
units from it. Two loops:

```
outer: ACCEPTANCE (one red acceptance test per scenario)
  inner: RED → GREEN → REFACTOR, unit by unit, until the acceptance test turns green
```

## The test list

```markdown
- [ ] Scenario: free shipping above 50 euros
      Given an order worth 60 euros shipped to France
      When it is placed
      Then it is saved with no shipping fees
  - [ ] an order worth 60 euros has no shipping fees
  - [ ] placing an order saves it
- [ ] Scenario: 5 euros of shipping below 50 euros
```

Scenarios are `- [ ] Scenario: ...` lines. Unit items are indented below their scenario and added as
collaborators are discovered. `tdd.js next` ticks a scenario when it sees its acceptance test green.

## The double loop with the guard

1. **ACCEPTANCE**: write the acceptance test for the next scenario. Wire Fakes for every
   infrastructure port. Run it: it must fail (a compile error is fine). `tdd.js next`.
2. **RED**: the first unit test the acceptance test needs, starting from the **outermost** unit
   (the use case handler), then inwards.
3. **GREEN**, **REFACTOR** as usual.
4. `tdd.js next` from REFACTOR runs the acceptance suite:
   - still red → RED again, next unit item;
   - green with scenarios left → ACCEPTANCE for the next scenario;
   - green, nothing left → OFF.

## Discovering ports

While writing the use case test, a need appears ("the order must be saved", "a confirmation is
emailed"). That is a **role**:

1. Name the role as a port, in the domain language: `Orders`, `Clock`, `ConfirmationSender`.
2. Write the smallest interface the test needs, nothing more.
3. Write or extend its **Fake** (`references/fakes.md`) and use it in the test.
4. Add the collaborator's own items to the list (the real adapter, its contract test). Do not build
   them now.

The use case then depends on ports only; the adapters come last and are checked against the same
contract tests as the Fakes.

## Assertions

Assert on outcomes and state: "the order is in the repository with no fees", "one email was sent to
X". Not on calls ("save was called with..."): call assertions couple the test to the implementation.
