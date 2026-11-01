---
description: Show the TDD cycle state, list progress, justified mocks and the test review checklist
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js *)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" status || true`

Show this status to the human as it is. If justified mocks are listed, ask whether each one should become a Fake.
