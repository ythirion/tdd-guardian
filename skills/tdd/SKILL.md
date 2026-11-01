---
name: tdd
description: Test-driven development enforced by the TDD guard (Red-Green-Refactor, one test at a time, inside-out or outside-in with Fakes). Use when the user mentions TDD, test first, test-driven, red green refactor, inside-out, outside-in, double loop, "build a feature with tests", or whenever .tdd/state.json exists with a phase other than OFF.
---

# TDD with the guard

The `tdd` plugin enforces the cycle with hooks: a write the current phase forbids is blocked, and
the block message gives the rule, the reason and what to do. This skill is the process those hooks
enforce. Follow it and the hooks never fire.

## 0. Before any action

1. Read `.tdd/state.json` (mode, phase, current test, acceptance test) and `.tdd/test-list.md`.
2. Load the reference for the mode: `references/inside-out.md` or `references/outside-in.md`.
3. Phases change only through `node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js next`, which checks the
   exit conditions itself. Never edit `.tdd/state.json`. `approve` and `off` belong to the human
   (`/tdd:approve`, `/tdd:off`).
4. `node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js status` shows where you are.

## Phases

```
OFF → LIST → (outside-in: ACCEPTANCE →) RED → GREEN → REFACTOR → RED | ACCEPTANCE | OFF
```

| Phase | You may write | Leave with `tdd.js next` when |
| --- | --- | --- |
| LIST | `.tdd/test-list.md` only | never: the human runs `/tdd:approve` |
| ACCEPTANCE | one acceptance test | exactly one new acceptance test, and it fails |
| RED | one unit test, Fakes, test support | exactly one new unit test, and the unit suite is red |
| GREEN | production code | unit suite green, test code unchanged since entering GREEN |
| REFACTOR | everything | unit suite green, assertion count not lower, current item ticked |

Details of the cycle and baby steps: `references/cycle.md`.

## 1. LIST

- **Inside-out**: unit cases in business language, from the core rules outwards.
- **Outside-in**: acceptance scenarios, one `- [ ] Scenario: ...` line each, with Given/When/Then.
  Unit items go indented under their scenario as collaborators are discovered.
- **Order the list so that each test completes one part of the implementation**, growing the
  thinnest complete implementation. Under each item, a `→ drives: ...` line says which part.
- **Start with the non-passing case** (an input that is refused). It decides the signature first:
  a refusal the business expects is an **error as a value** (`Optional`, `Either`, a `Result` or a
  sealed type), not an exception; exceptions are for the truly exceptional.
- Tag an item `[property]` when it states a rule over a range of inputs rather than one example
  (see `references/property-based.md`).
- No code, no test. Stop and ask the human to review the list and run `/tdd:approve`.

## 2. ACCEPTANCE (outside-in only)

Write one acceptance test for the next scenario, at the use case or API boundary, wiring a Fake for
every infrastructure port (repository, clock, ids, mailer, bus, external API). Run the acceptance
suite, check it fails (a compile error is fine at this level), then `tdd.js next`.

## 3. RED

Write **exactly one** unit test, for the simplest unticked item.

- Outside-in: start from the outermost unit the acceptance test needs. When a new collaborator
  role appears, name its port, write or extend its Fake (`references/fakes.md`), and add the
  collaborator's own items to the list (do not implement them now).
- Follow the test design guidelines: business name, one class or `describe` per use case
  (`references/naming-and-organization.md`), Arrange through builders and Object Mothers
  (`references/test-data-builders.md`), Assert through business assertions
  (`references/business-assertions.md`). A missing builder method or assertion is written now,
  from its usage in the test.
- Run the unit suite. The test must fail **for the expected reason**. Then `tdd.js next`.

## 4. GREEN

Minimal production code (`references/green-moves.md`): fake it first, then let the next test
triangulate; follow the Transformation Priority Premise. Never touch tests, Fakes or test support:
they are read-only and hashed. Whole unit suite green, then `tdd.js next`.

## 5. REFACTOR

- Production code: remove duplication, name, extract, apply the project's rules.
- Tests: an Arrange longer than about five lines becomes a builder; technical assertions on one
  object become a business assertion; a repeated literal becomes an Object Mother or a constant.
- Green after every change. Never remove a check (the assertion count is compared).
- Run the review checklist below, tick the item in `.tdd/test-list.md`, then `tdd.js next`.
  In outside-in, `next` runs the acceptance suite: red → back to RED, green → next scenario.

## 6. Always

- A new case shows up: add it to the list, do not implement it.
- Blocked by a hook: read the message and do what it says. Never work around it (Bash redirections,
  copies, `git checkout` of tests are blocked too, and a changed test hash is caught on leaving GREEN).
  If the rule looks wrong for the situation, ask the human.
- Stop only in a handable state: the Stop hook keeps you going while GREEN or REFACTOR is red, or
  while RED/ACCEPTANCE has no failing test yet.

## Subagents (recommended)

Delegate each phase so that the one implementing did not write the test:

- `tdd-tester` for ACCEPTANCE and RED: give it the item or scenario, the mode, existing tests and Fakes.
- `tdd-implementer` for GREEN: give it the failing test and its output, **not the list**.
- `tdd-refactorer` for REFACTOR: give it the cycle's diff and the project's rules.

The hooks protect either way; the orchestrator (you) runs `tdd.js next` between phases.

## Test doubles

- Inside-out: real objects, built from the core outwards; mocks rarely needed (`mockPolicy: allow`).
- Outside-in: **Fakes over mocks** (`mockPolicy: justify`). Assert on the state a Fake exposes, not on
  calls. A mocking-library call needs `tdd-guard: allow-mock <reason>` on the same or previous line,
  only when no port exists (third-party SDK, legacy code). Justified mocks are listed by `/tdd:status`.
  Shared contract tests run against both the Fake and the real adapter (`references/fakes.md`).

## Review checklist (before returning a test, before leaving REFACTOR)

- [ ] Would I understand this test in five seconds without opening another file?
- [ ] Does the name say the context and the outcome in business language?
- [ ] Does the Arrange show only what this test is about?
- [ ] Does the Assert read as a business sentence, and check the side effects the business requires?
- [ ] Is there a rule behind these examples that a property should state?
- [ ] If I break the code this test covers, does it turn red? (`/tdd:mutate` answers it)

## References

- `references/cycle.md`: Red-Green-Refactor, baby steps, what "fails for the right reason" means
- `references/green-moves.md`: fake it, triangulation, Transformation Priority Premise
- `references/inside-out.md`: core first, ordering the list, the final integration test
- `references/outside-in.md`: double loop, port discovery
- `references/fakes.md`: writing Fakes, when a mock is acceptable, contract tests
- `references/naming-and-organization.md`: test names, one class per use case, folders
- `references/test-data-builders.md`: builders, Object Mothers
- `references/business-assertions.md`: assertions in the domain language
- `references/property-based.md`: when and how to write properties
