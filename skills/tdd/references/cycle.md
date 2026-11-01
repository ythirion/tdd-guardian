# The Red-Green-Refactor cycle

## The three steps

1. **Red**: write one test for the next behaviour. Run it. It must fail, and for the right reason.
2. **Green**: write the minimal code that makes it pass. Every test stays green.
3. **Refactor**: improve the design of code and tests, behaviour unchanged, green after each change.

Then pick the next item. The list grows as you learn; it is never implemented ahead.

## "Fails for the right reason"

A test fails for the right reason when the failure says the behaviour is missing:

- an assertion on the new behaviour (`expected 'Fizz', received '3'`);
- in a typed language, the missing function or class the test calls (a compile error is a failure).

It fails for the wrong reason when the failure says nothing about the behaviour: a typo, a broken
import, a fixture that crashes, a test that never reaches its assertion. Fix the test before moving on.
A test that passes on first run is suspicious: either the behaviour already exists (remove the item)
or the test does not check what it claims.

## Baby steps

- One test at a time. The guardian counts new tests on every write in RED and ACCEPTANCE.
- The smallest test that forces a change. Start with the degenerate cases (empty, zero, one).
- When a step feels big, it is: go back to green, write a smaller test.
- Commit on green (and after each refactoring) so any step can be undone cheaply.

## Why the guardian checks what it checks

| Check | Problem it prevents |
| --- | --- |
| A human approves the list | Starting without a plan nobody reviewed |
| One new test, seen failing | Tautological tests written with their code |
| Tests read-only in GREEN, hashed | Weakening a test to get to green |
| Disabling markers rejected | `skip` hiding a red test |
| REFACTOR is a phase, exit needs green | Skipping refactoring as soon as it passes |
| Assertion count not lower after REFACTOR | "Refactoring" that deletes checks |
| Fakes over mocks in outside-in | Tests coupled to implementation details |
