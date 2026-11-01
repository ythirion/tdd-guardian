# Example: FizzBuzz, inside-out

The result of a full TDD Guardian session in inside-out mode: five cycles, simplest case first,
ending with one property for the rule "every multiple of 15 is FizzBuzz".

- `.tdd/test-list.md`: the approved list, every item ticked.
- `test/fizzbuzz.test.js`: one test per item, written one at a time and seen failing first.
- `test/support/properties.js`: a tiny property runner so the example needs no dependency
  (use fast-check in a real project).
- `src/fizzbuzz.js`: grown from `() => '1'` (fake it) through `String(n)` (triangulation) to the rules.

`npm test` runs it. The plugin's own test suite replays the whole session through the hooks and
`tdd.js` (`test/examples/fizzbuzz-inside-out.test.js`) and checks it produces these exact files.
