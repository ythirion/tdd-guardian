---
description: Start a TDD feature (inside-out or outside-in) and draft its test list
argument-hint: <feature> [--mode inside-out|outside-in]
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js *)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" start $ARGUMENTS || true`

The output above comes from the TDD Guardian. If it created `.tdd/config.json`, show the human the
detected `testCommand`, `acceptanceCommand` and file patterns and ask them to confirm or correct them.

Then load the `tdd` skill and draft `.tdd/test-list.md` for this feature, following the mode:

- inside-out: unit cases in business language, from the core rules outwards, simplest first;
- outside-in: one `- [ ] Scenario: ...` per acceptance test (Given/When/Then), unit items indented
  below as they are discovered.

Tag an item `[property]` when it states a rule over a range of inputs. Write no code and no test.
Finish by asking the human to review the list and run `/tdd:approve`.
