---
description: Move to the next TDD phase if its exit conditions are met, otherwise explain why
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js *)
---

- If the context above says "the human ran /tdd:next", the TDD Guardian already applied the
  transition when the prompt was submitted (this is how the human ends a review pause). Do not run
  `tdd.js next` again: run `node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" status` and start the phase it
  shows, following the `tdd` skill.
- Otherwise run `node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" next`.

If the transition was refused, explain the failed condition in your own words and do what it asks.
A "Review pause" is not an error: the item is done, so stop, show the human the test, the production
code, the refactoring and the suite output, and wait for them to type `/tdd:next`.
