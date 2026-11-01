# Example: a Luhn number, inside-out (Java)

The Luhn (mod 10) checksum of card, IMEI and SIRET numbers, built one test at a time under the guard.
`test/examples/luhn-inside-out.test.js` replays the whole session through the real hooks and Maven,
and checks that it ends with exactly these files.

```sh
mvn test   # Java 21+, Maven 3.9+
```

## What it shows

- **The list opens with the non-passing case** (`an empty number is not a Luhn number`). It decides
  the signature first: `LuhnNumber.parse` returns `Optional<LuhnNumber>`, an invalid number is an
  expected answer, not an exception.
- **Every item says what it drives** (`→ drives:` in `.tdd/test-list.md`): each test adds one part
  of the implementation (the type, the checksum, the doubling, the subtraction of 9, the spaces, the
  digits-only guard, the check digit), so the list grows the thinnest complete implementation.
- **Fake it, then triangulate**: the first GREEN is `return Optional.empty()`, the check digit is
  first `return 3`.
- **A round-trip property** with junit-quickcheck (`RoundTripOfALuhnNumber`): any valid Luhn
  number, parsed into a `LuhnNumber` then written back with `toString`, is the same String. The
  generator `ValidLuhnNumbers` encodes "valid" as a random payload followed by its check digit, so
  the fake `return 3` cannot survive it.
- **Blocked moves** in the replay: production code in LIST and RED, a test edited in GREEN, and an
  `@Disabled` added to a test.

junit-quickcheck runs on JUnit 4; `junit-vintage-engine` runs it next to the JUnit 5 tests.
