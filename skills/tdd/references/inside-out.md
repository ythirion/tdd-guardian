# Inside-out (classicist) TDD

Start from the domain core (rules, value objects, entities) and build outwards. Collaborators are
real objects, already built, so test doubles are rarely needed (`mockPolicy: allow` by default).

## Ordering the test list

1. Value objects and pure rules first: they have no dependencies and the simplest tests.
2. Entities and aggregates that use them.
3. Domain services and use cases that orchestrate them.
4. Adapters (persistence, HTTP) last.

Inside each unit, simplest first: degenerate case, one example, the next example that forces a
generalisation, the edge cases, the failures. Write items in business language, not method names:

```markdown
- [ ] a number not divisible by 3 or 5 is said as itself
- [ ] a multiple of 3 is Fizz
- [ ] a multiple of 5 is Buzz
- [ ] [property] every multiple of 15 is FizzBuzz
```

## Done

Every item ticked. The cycle ends in OFF when `tdd.js next` finds no unticked item.

## The final integration test

Inside-out grows units that each work in isolation; nothing yet proves they are wired together. Add
one integration or acceptance-level item at the end of the list (the use case through its real entry
point), or switch to outside-in for features where the wiring is the risk.

## When to prefer outside-in

The feature is a use case across several collaborators, the boundaries (ports) are not known yet,
or the risk is in the interactions rather than in the rules.
