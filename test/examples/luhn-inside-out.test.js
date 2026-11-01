'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { session, MAVEN_MISSING } = require('./replay')

const PARSING = 'src/test/java/luhn/ParsingALuhnNumber.java'
const CHECK_DIGIT = 'src/test/java/luhn/ComputingTheCheckDigit.java'
const ROUND_TRIP = 'src/test/java/luhn/RoundTripOfALuhnNumber.java'
const GENERATOR = 'src/test/java/luhn/generators/ValidLuhnNumbers.java'
const LUHN = 'src/main/java/luhn/LuhnNumber.java'

// The tests of ParsingALuhnNumber, one per cycle, taken from the example's final file.
function parsingVersions(final) {
  const [header] = final.split('    @Test\n')
  const tests = final.slice(header.length, final.lastIndexOf('}')).split(/\n(?=    @Test\n)/)
  return (count) => header + tests.slice(0, count).map((t) => t.replace(/\n*$/, '\n')).join('\n') + '}\n'
}

const LUHN_FAKE = `package luhn;

import java.util.Optional;

public final class LuhnNumber {
    private LuhnNumber() {
    }

    public static Optional<LuhnNumber> parse(String number) {
        return Optional.empty();
    }
}
`
const luhn = (parseBody, extra = '') => `package luhn;

import java.util.Optional;

public final class LuhnNumber {
    private final String digits;

    private LuhnNumber(String digits) {
        this.digits = digits;
    }

    public static Optional<LuhnNumber> parse(String number) {
${parseBody}
    }
${extra}}
`
const LUHN_OR_EMPTY = (digits) => `sum % 10 == 0 ? Optional.of(new LuhnNumber(${digits})) : Optional.empty()`
const EMPTY_GUARD = (digits, condition = `${digits}.isEmpty()`) => `        if (${condition}) {\n            return Optional.empty();\n        }\n`
const SUM_FROM_THE_RIGHT = (digits, doubling) => `        int sum = 0;
        for (int position = 0; position < ${digits}.length(); position++) {
            int digit = ${digits}.charAt(${digits}.length() - 1 - position) - '0';
            sum += position % 2 == 1 ? ${doubling} : digit;
        }
        return ${LUHN_OR_EMPTY(digits)};`
const SUBTRACT_9 = '(digit * 2 > 9 ? digit * 2 - 9 : digit * 2)'
const STRIP = '        String digits = number.replace(" ", "");\n'
const ONLY_DIGITS = "digits.isEmpty() || !digits.chars().allMatch(c -> c >= '0' && c <= '9')"
const LUHN_VERSIONS = [
  LUHN_FAKE,
  luhn('        return number.isEmpty() ? Optional.empty() : Optional.of(new LuhnNumber(number));'),
  luhn(EMPTY_GUARD('number') + `        int sum = 0;
        for (char c : number.toCharArray()) {
            sum += c - '0';
        }
        return ${LUHN_OR_EMPTY('number')};`),
  luhn(EMPTY_GUARD('number') + SUM_FROM_THE_RIGHT('number', 'digit * 2')),
  luhn(EMPTY_GUARD('number') + SUM_FROM_THE_RIGHT('number', SUBTRACT_9)),
  luhn(STRIP + EMPTY_GUARD('digits') + SUM_FROM_THE_RIGHT('digits', SUBTRACT_9)),
  luhn(STRIP + EMPTY_GUARD('digits', ONLY_DIGITS) + SUM_FROM_THE_RIGHT('digits', SUBTRACT_9)),
]
const WITH_FAKE_CHECK_DIGIT = luhn(STRIP + EMPTY_GUARD('digits', ONLY_DIGITS) + SUM_FROM_THE_RIGHT('digits', SUBTRACT_9),
  '\n    public static int checkDigitOf(String payload) {\n        return 3;\n    }\n')

describe('Example: Luhn number in Java, inside-out', () => {
  it('starts with the non-passing case, ends with a parse/toString round trip, and produces the example files', { skip: MAVEN_MISSING }, () => {
    const s = session('luhn-inside-out')
    const parsingUpTo = parsingVersions(s.final(PARSING))
    const items = [...s.final('.tdd/test-list.md').matchAll(/^- \[x\] (.+)$/gm)].map((m) => m[1])

    assert.equal(s.tdd('start', 'Luhn number', '--mode', 'inside-out').code, 0)
    s.write('.tdd/test-list.md', s.final('.tdd/test-list.md').replace(/- \[x\]/g, '- [ ]'))
    s.blocked(LUHN, LUHN_FAKE, /LIST/)
    s.human('/tdd:approve')
    assert.equal(s.phase(), 'RED')

    // Parsing, from the non-passing case to the digits-only guard: one test, one code version per cycle.
    for (let cycle = 0; cycle < LUHN_VERSIONS.length; cycle++) {
      s.write(PARSING, parsingUpTo(cycle + 1))
      s.blocked(LUHN, LUHN_VERSIONS[cycle], /RED/)
      s.next('GREEN')
      s.blocked(PARSING, parsingUpTo(cycle), /GREEN/)
      s.write(LUHN, LUHN_VERSIONS[cycle])
      s.next('REFACTOR')
      s.tick(items[cycle])
      s.next('RED')
    }

    // The check digit: a new behaviour, a new test class. Fake it.
    s.blocked(PARSING, parsingUpTo(7).replace('    @Test\n    void spacesAreIgnored', '    @Disabled\n    @Test\n    void spacesAreIgnored'), /disabled/)
    s.write(CHECK_DIGIT, s.final(CHECK_DIGIT))
    s.next('GREEN')
    s.write(LUHN, WITH_FAKE_CHECK_DIGIT)
    s.next('REFACTOR')
    s.tick(items[7])
    s.next('RED')

    // The round trip, with junit-quickcheck: the generator needs the real check digit, and toString.
    s.write(GENERATOR, s.final(GENERATOR))
    s.write(ROUND_TRIP, s.final(ROUND_TRIP))
    s.next('GREEN')
    s.write(LUHN, s.final(LUHN))
    s.next('REFACTOR')
    s.tick(items[8])
    s.next('OFF')

    assert.equal(parsingUpTo(7), s.final(PARSING))
    s.assertSameFilesAsExample(['src'])
    assert.equal(fs.readFileSync(path.join(s.root, '.tdd/test-list.md'), 'utf8'), s.final('.tdd/test-list.md'))
  })
})
