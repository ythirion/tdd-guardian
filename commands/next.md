---
description: Move to the next TDD phase if its exit conditions are met, otherwise explain why
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js *)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" next || true`

The output above comes from the TDD Guardian. If the transition was refused, explain the failed
condition in your own words and do what it asks. If it succeeded, start the new phase following the `tdd` skill.
