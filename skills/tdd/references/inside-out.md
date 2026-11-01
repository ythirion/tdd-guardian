# Inside-out (classicist) TDD

Start from the domain core (rules, value objects, entities) and build outwards. Collaborators are
real objects, already built, so test doubles are rarely needed (`mockPolicy: allow` by default).

## Ordering the test list

1. Value objects and pure rules first: they have no dependencies and the simplest tests.
2. Entities and aggregates that use them.
3. Domain services and use cases that orchestrate them.
4. Adapters (persistence, HTTP) last.

Inside each unit: the non-passing case first (it fixes how a refusal is returned, as a value, not
an exception), then the simplest accepted case, then each example that forces one more rule. One
item = one precise example, `input → outcome: rule`:

```markdown
- [ ] "" → not a Luhn number (Optional.empty())
- [ ] "0" → a Luhn number
- [ ] "1" → not a Luhn number: the digit sum must end with 0
- [ ] "18" → a Luhn number: every second digit from the right is doubled
- [ ] "59" → a Luhn number: a doubled digit above 9 has 9 subtracted
- [ ] "4539 3195 0343 646A" → not a Luhn number: digits only
- [ ] [property] any valid Luhn number n → parse(n).toString() is n
```

Each example must be red against the code of the previous one. One that would already pass forces
nothing: drop it or move it.

## Done

Every item ticked. The cycle ends in OFF when `tdd.js next` finds no unticked item.

## The final integration test

Inside-out grows units that each work in isolation; nothing yet proves they are wired together. Add
one integration or acceptance-level item at the end of the list (the use case through its real entry
point), or switch to outside-in for features where the wiring is the risk.

## When to prefer outside-in

The feature is a use case across several collaborators, the boundaries (ports) are not known yet,
or the risk is in the interactions rather than in the rules.
