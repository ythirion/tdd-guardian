# tdd-guardian: test list (approved 2026-11-01)

Built test-first with `node:test`, zero dependency. One item = one test, written and seen red before
the code. Hook scripts are tested end to end by piping a JSON payload on stdin into a child process
and checking exit code and stderr. Test commands of the fixture projects are real processes
(`node -e "process.exit(1)"`), not mocks.

## Spec adjustments after reading the Claude Code docs (2026-11-01)

1. **Command names.** Plugin commands are namespaced by the plugin name: `commands/tdd/start.md`
   in a plugin named `tdd-guardian` becomes `/tdd-guardian:tdd:start`. To get the spec's
   `/tdd:start`, the plugin is named `tdd` (with `displayName: "TDD Guardian"`) and the commands
   are flat files `commands/start.md`, `commands/approve.md`, ...
2. **Human-only `approve` / `off`.** The docs say `!` command execution "runs through the Bash
   tool" and do not say whether PreToolUse hooks fire on it. If they do, `guard-bash.js` would
   also block the human. Safer mechanism: a **UserPromptSubmit** hook (`human-gate.js`). It only
   fires on prompts the human types, receives `/tdd:approve` as typed, and performs the
   transition in-process. Defence in depth: `tdd.js approve|off` refuse to run when `CLAUDECODE`
   is set (Claude Code sets it in the Bash tool's shell), and `guard-bash.js` blocks any agent call
   to them. A human can still run them from their own terminal. `approve.md` and `off.md` set
   `disable-model-invocation: true`.
3. **Tool inputs.** `Write` → `file_path`, `content`; `Edit` → `file_path`, `old_string`,
   `new_string`, `replace_all`; `MultiEdit` → `file_path`, `edits[]`; `NotebookEdit` →
   `notebook_path`. All four are handled; the proposed content is rebuilt from the file on disk.
4. **Plugin agents** cannot declare hooks or `permissionMode`; that is fine because plugin
   hooks also fire on subagent tool calls. Agents use `tools` to restrict themselves.
5. **"The only failing unit test"** (RED → GREEN) cannot be read from an exit code. It is
   implied: the suite was green when leaving REFACTOR / approval, production code is read-only in
   RED, and exactly one new test was added. So: suite red + exactly one new test.
6. **SessionStart** context goes out as `hookSpecificOutput.additionalContext`, written as facts.

## A. `scripts/lib/` (core)

### Config
- [x] A1 With no `.tdd/config.json`, the defaults are used (mode outside-in, strict, mock policies allow/justify)
- [x] A2 A project config overrides the defaults key by key, and `mockPolicy` per mode
- [x] A3 Auto-detection proposes a Node config from `package.json`, a Maven one from `pom.xml`, a Python one from `pyproject.toml`, a .NET one from `*.csproj`

### Glob and file classification
- [x] A4 `**/*.test.ts` matches `src/foo.test.ts` and not `src/foo.ts`; `test/**` matches nested files; `*.md` matches at any depth
- [x] A5 A file under `test/acceptance/**` is an acceptance test, even though it also matches `test/**`
- [x] A6 A file under `test/fakes/**` or `test/builders/**` is test code (same family as unit tests)
- [x] A7 `README.md` and docs are free files; `.tdd/test-list.md` is its own kind (writable except in GREEN)
- [x] A8 `.tdd/state.json` and `.tdd/config.json` are guard files
- [x] A9 A file matching no pattern is production code
- [x] A10 Absolute paths and Windows separators are classified relative to the project root

### State
- [x] A11 With no state file, the phase is OFF
- [x] A12 State is saved and read back as written
- [x] A13 The mode can change in OFF and LIST, and is refused in ACCEPTANCE, RED, GREEN, REFACTOR

### Counting
- [x] A14 Counts tests: `it(`, `test(`, `@Test`, `[Fact]`, `[Theory]`, `def test_`
- [x] A15 A property counts as one test: `[Property]` alone, `fc.assert(fc.property(` inside `it(` counts once, `@given` + `def test_` counts once
- [x] A16 Detects disabling markers: `.skip`, `xit`, `xdescribe`, `@Disabled`, `@Ignore`, `pytest.mark.skip`, `[Ignore]`
- [x] A17 Counts assertions: `expect(`, `assert`, `Check.That`, plus calls matching `assertionMethodPatterns`
- [x] A18 The test-code hash is stable, and changes when one byte of a unit test, Fake or builder changes; production files do not affect it

### Mock detection
- [x] A19 New lines matching `mockPatterns` are found (only lines added, compared with the old content)
- [x] A20 A mock line justified by `tdd-guard: allow-mock <reason>` on the same or previous line is accepted, and its reason extracted
- [x] A21 `tdd-guard: allow-mock` with no reason does not justify anything

### Command runner
- [x] A22 Exit code 0 is green, anything else is red; the output tail is kept for messages

## B. `guard-write.js` (PreToolUse `Write|Edit|MultiEdit|NotebookEdit`)
- [x] B1 OFF: production, tests and acceptance tests are writable
- [x] B2 Any phase: `.tdd/state.json` is blocked
- [x] B3 GREEN: an `Edit` on `src/foo.test.ts` is blocked, with a message quoting the rule, the reason and the expected action
- [x] B4 GREEN: an `Edit` on `test/fakes/in-memory-orders.ts` is blocked
- [x] B5 GREEN: a builder in `test/builders/**` is blocked
- [x] B6 GREEN: production code is writable; `.tdd/test-list.md` is blocked
- [x] B7 RED: a `Write` on `src/foo.ts` is blocked
- [x] B8 RED: writing one new test is allowed; a builder in `test/builders/**` is allowed
- [x] B9 RED: adding two tests at once is blocked (one file, then across two files)
- [x] B10 RED: adding one `[Property]` / `fc.assert(fc.property(` counts as exactly one new test
- [x] B11 RED: adding `it.skip(` is blocked
- [x] B12 LIST: everything is blocked except `.tdd/test-list.md`
- [x] B13 ACCEPTANCE: a unit test or production code is blocked; one acceptance test is allowed; two are blocked
- [x] B13b GREEN: acceptance tests are blocked (gap found while building)
- [x] B14 REFACTOR: production, tests and acceptance tests are writable
- [x] B15 `README.md` is writable in every phase
- [x] B16 Outside-in, `justify`: a new `jest.fn()` without a reason is blocked, the message points to `references/fakes.md` and suggests a Fake
- [x] B17 Outside-in, `justify`: with `tdd-guard: allow-mock <reason>` it passes and is appended to `justifiedMocks`
- [x] B18 `forbid`: a justified mock is still blocked
- [x] B19 Inside-out, `allow`: `jest.fn()` passes without a reason
- [x] B20 `Edit`, `MultiEdit` and `NotebookEdit` payloads are rebuilt into the proposed content
- [x] B21 Every written file is recorded in `touchedFiles`
- [x] B22 `strict: false`: a blocked case exits 0 with a warning on stderr
- [x] B23 Invalid JSON on stdin, or no `.tdd/` at all: lets the tool through (never breaks a non-TDD session)

## C. `tdd.js` (phase transition CLI)
- [x] C1 `start <feature> --mode inside-out` from OFF enters LIST with the mode and writes a test-list skeleton
- [x] C2 `start` without `--mode` uses `defaultMode`; creates `.tdd/config.json` from detection when missing
- [x] C3 `start` / `mode` refuse to change the mode outside OFF and LIST
- [x] C4 `next` in LIST refuses: approval is human-only
- [x] C5 Inside-out: `approve` goes from LIST to RED and records the test count
- [x] C6 Outside-in: `approve` goes from LIST to ACCEPTANCE
- [x] C7 `approve` / `off` are refused when run from an agent shell (`CLAUDECODE` set)
- [x] C8 ACCEPTANCE → RED: refused with zero or two new acceptance tests, or a green acceptance suite; accepted with one new failing acceptance test
- [x] C9 RED → GREEN: refused when the unit suite is green
- [x] C10 RED → GREEN: refused with two new tests; accepted with one new failing test; records the test-code hash
- [x] C11 GREEN → REFACTOR: refused when the unit suite is red
- [x] C12 GREEN → REFACTOR: refused when test, Fake or test support files changed; accepted otherwise; records the assertion count
- [x] C13 REFACTOR: refused when the suite is red, when the assertion count dropped, or when the current item is not ticked
- [x] C14 REFACTOR: extracting three assertions into a business assertion matching `assertionMethodPatterns` is accepted
- [x] C15 Inside-out REFACTOR → RED while unticked items remain; → OFF when all are ticked
- [x] C16 Outside-in REFACTOR → RED while the acceptance test is red
- [x] C17 Outside-in REFACTOR → ACCEPTANCE once the acceptance test is green with scenarios left
- [x] C18 Outside-in REFACTOR → OFF when every scenario is green and every item ticked
- [x] C19 Every refusal explains which condition failed and what to do
- [x] C20 `status` prints mode, phase, current test, acceptance test, list progress, last run, justified mocks and the review checklist
- [x] C21 `commitOnRefactor` commits with a Conventional Commit message when the project is a git repo (skipped otherwise)
- [x] C22 `mutate` runs `mutationCommand` on `touchedFiles`, prints the install hint when the tool is missing, never fails

## D. `check-stop.js` (Stop)
- [x] D1 GREEN with a red unit suite: stopping is blocked
- [x] D2 GREEN with `stop_hook_active`: stopping is allowed with a warning
- [x] D3 REFACTOR with a red unit suite: blocked
- [x] D4 RED with no new failing test: blocked with a reminder
- [x] D5 OFF, LIST, or green suite: allowed

## E. `guard-bash.js` (PreToolUse `Bash`)
- [x] E1 GREEN: `sed -i` on a test file is blocked
- [x] E2 GREEN: `>`, `>>`, `tee`, `cp`, `mv`, `rm`, `git checkout` / `git restore` on a test file are blocked
- [x] E3 GREEN: running the test command, or `cat` on a test file, is allowed
- [x] E4 Any phase: an agent call to `tdd.js off` or `tdd.js approve` is blocked
- [x] E5 Any phase: a write into `.tdd/` is blocked; `node tdd.js next` is allowed
- [x] E6 `strict: false`: warns without blocking

## F. `session-start.js` and `human-gate.js`
- [x] F1 SessionStart, active phase: context lists mode, phase, acceptance test, current test, remaining items, rules of the phase
- [x] F2 SessionStart, OFF: prints nothing
- [x] F3 UserPromptSubmit `/tdd:approve` performs LIST → RED/ACCEPTANCE; other prompts pass unchanged
- [x] F4 UserPromptSubmit `/tdd:off` performs the move to OFF

## G. Plugin packaging (checked by a test that parses the files)
- [ ] G1 `plugin.json`, `hooks.json` are valid and every script they reference exists
- [ ] G2 `SKILL.md` is under 200 lines, has the trigger description, links every reference that exists
- [ ] G3 Each agent has a restricted `tools` list (`tdd-implementer` has no access to the test list)
- [ ] G4 `claude plugin validate .` passes (manual check)

## H. Examples (end to end, run by a test that drives `tdd.js` + hooks through a full cycle)
- [ ] H1 FizzBuzz inside-out, with the property "every multiple of 15 is FizzBuzz"
- [ ] H2 "Place an order" outside-in: in-memory repository Fake, shared contract test, `OrderBuilder`
      with Object Mothers, business assertions on the saved order

## I. Docs
- [ ] I1 README: installation, configuration, both modes, Fakes vs mocks, known limits (Bash guard is a heuristic)
- [ ] I2 Skill references: cycle, green-moves, inside-out, outside-in, fakes, naming-and-organization, test-data-builders, business-assertions, property-based
