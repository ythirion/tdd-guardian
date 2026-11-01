---
description: Start a TDD feature (inside-out or outside-in) and draft its test list
argument-hint: <feature> [--mode inside-out|outside-in] [--language L] [--test-stack T] [--stack S]
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js *), AskUserQuestion
---

Arguments: `$ARGUMENTS`

The stack the project already declares (detected from its build files, `null` when there is none):

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" detect || true`

## 1. The stack: deduced when there is context, asked only when there is none

- **The detection found a language, or the arguments give `--language`**: ask nothing. Run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" start $ARGUMENTS`: the detected stack is recorded.
  Tell the human, in one line, the stack you start with.
- **No language detected and none given** (an empty repository): ask the human, one question at
  a time, with your selection tool (`AskUserQuestion` in Claude Code, `ask_user` in GitHub Copilot).
  Each question has an "Other" answer to describe something else.
  1. **Language**: Java, TypeScript, C#, Python (other: Kotlin, Go, F#, JavaScript...).
  2. **Test stack**, for that language:

     | Language | Options |
     | --- | --- |
     | Java, Kotlin | JUnit 5 + AssertJ, JUnit 5 + AssertJ + jqwik, Kotest |
     | TypeScript, JavaScript | Vitest, Vitest + fast-check, Jest |
     | C#, F# | xUnit + FluentAssertions, xUnit + NFluent + FsCheck, NUnit |
     | Python | pytest, pytest + Hypothesis |

  3. **Additional stack**, to describe: none, or a framework for that language (Java: Spring Boot,
     Quarkus; TypeScript: Express, NestJS; C#: ASP.NET Core; Python: FastAPI, Django), or any
     other description.

  Then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/tdd.js" start <feature> [--mode ...] --language "<1>"
  --test-stack "<2>" [--stack "<3>"]` (leave `--stack` out for none).

If `start` created `.tdd/config.json`, show the human the `testCommand`, `acceptanceCommand` and
file patterns and ask them to confirm or correct them.

## 2. The test list

Load the `tdd` skill and draft `.tdd/test-list.md` for this feature, in the language and test stack
above: one precise example per item, `input → outcome`, starting with the non-passing case. Write no
code and no test. Finish by asking the human to review the list and run `/tdd:approve`.
