# Example: Luhn number, inside-out (Java)

```sh
mvn test   # Java 21+, Maven 3.9+
```

The test list, one example per test, in the order they were written (`.tdd/test-list.md`):

| Example | Rule it forces |
| --- | --- |
| `""` → not a Luhn number (`Optional.empty()`) | a refusal is a value, not an exception |
| `"0"` → a Luhn number | |
| `"1"` → not a Luhn number | the digit sum must end with 0 |
| `"18"` → a Luhn number | every second digit from the right is doubled |
| `"59"` → a Luhn number | a doubled digit above 9 has 9 subtracted |
| `"4539 3195 0343 6467"` → a Luhn number | spaces are ignored |
| `"4539 3195 0343 646A"` → not a Luhn number | digits only |
| `checkDigitOf("7992739871")` → 3 | |
| [property] any valid Luhn number `n` → `parse(n).toString()` is `n` | round trip, junit-quickcheck |

The round trip's generator (`ValidLuhnNumbers`) builds a random payload followed by its check digit,
so the `return 3` written in "fake it" fails it.

`test/examples/luhn-inside-out.test.js` replays the session through TDD Guardian's hooks and Maven.
The replay also shows writes that get blocked: production code in LIST and in RED, a test edited in
GREEN, and an `@Disabled`.
