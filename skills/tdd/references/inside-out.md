# Inside-out (classicist) TDD

Start from the domain core (rules, value objects, entities) and build outwards. Collaborators are
real objects, already built, so test doubles are rarely needed (`mockPolicy: allow` by default).

## Ordering the test list

1. Value objects and pure rules first: they have no dependencies and the simplest tests.
2. Entities and aggregates that use them.
3. Domain services and use cases that orchestrate them.
4. Adapters (persistence, HTTP) last.

Inside each unit, **start with the non-passing case**: it fixes the signature and how a refusal is
returned (an error as a value: `Optional`, `Either`, a `Result` or sealed type, not an exception).
Then the simplest accepted case, then each example that forces one more part of the rule, then the
edge cases. Every item completes one part of the implementation, and says which, so that the list
grows the thinnest complete implementation. Write items in business language, not method names:

```markdown
- [ ] an empty number is not a Luhn number
      → drives: the signature: parse returns Optional.empty(), never an exception (fake it)
- [ ] a single zero is a Luhn number
      → drives: the LuhnNumber type, created for a non-empty number
- [ ] a single non-zero digit is not a Luhn number
      → drives: the checksum: the sum of the digits must end with 0
- [ ] every second digit from the right is doubled: 18 is a Luhn number
      → drives: the doubling, walking the digits from the right
- [ ] [property] round trip: any valid Luhn number, parsed then written back, is the same String
      → drives: toString, and the general check digit the generator needs
```

An item whose test would pass without new code drives nothing: drop it or reorder the list.

## Done

Every item ticked. The cycle ends in OFF when `tdd.js next` finds no unticked item.

## The final integration test

Inside-out grows units that each work in isolation; nothing yet proves they are wired together. Add
one integration or acceptance-level item at the end of the list (the use case through its real entry
point), or switch to outside-in for features where the wiring is the risk.

## When to prefer outside-in

The feature is a use case across several collaborators, the boundaries (ports) are not known yet,
or the risk is in the interactions rather than in the rules.
