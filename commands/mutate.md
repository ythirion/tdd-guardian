---
description: Run mutation testing on the files touched in this feature and turn survivors into list items
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js *)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" mutate || true`

Read the mutation report above. Give the score and the surviving mutants. For each survivor, propose
one item for `.tdd/test-list.md`; when it sits on a side effect (event, save, notification), name
the business assertion that would kill it. Ask the human before adding the items.
