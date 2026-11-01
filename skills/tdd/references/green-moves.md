# Getting to green with minimal code

## Fake it

Return exactly what the test expects:

```ts
export const fizzbuzz = (n: number) => '1'
```

It feels like cheating; it is a step. It proves the test, the wiring and the call site work, and it
leaves the duplication (the `'1'` in the test and in the code) for REFACTOR or the next test to remove.

## Triangulation

Add a second example that the fake cannot satisfy, then generalise:

```ts
// test: says 2 for 2 → the constant no longer works
export const fizzbuzz = (n: number) => String(n)
```

Only generalise when a test forces it. Two or three examples usually reveal the rule.

## Obvious implementation

When the implementation is truly obvious and small, write it. If the test then fails unexpectedly,
fall back to fake it: the step was bigger than it looked.

## Transformation Priority Premise

Prefer the simpler transformation (top of the list) when a test forces a change:

1. `{}` → nil / nothing
2. nil → constant
3. constant → constant+ (a more complex constant)
4. constant → scalar (a variable, a parameter)
5. statement → statements (unconditional)
6. unconditional → `if` (split the path)
7. scalar → array / collection
8. array → container
9. statement → tail recursion
10. `if` → `while` / loop
11. expression → function (extract the computation)
12. variable → assignment (mutate state)

Picking the higher transformation keeps the code minimal and lets the tests choose the algorithm.

## Properties in GREEN

A property (`[property]` item) holds for a whole family of inputs, so a constant will not do: the
generator already triangulates. Write the general rule, still the simplest one that holds.

## Not in GREEN

- No change to tests, Fakes, builders or business assertions (blocked, and hashed).
- No refactoring beyond what green needs. No code for the next items.
