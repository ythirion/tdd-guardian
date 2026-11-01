'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { session } = require('./replay')

const HEADER = `'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { fizzbuzz } = require('../src/fizzbuzz')

describe('FizzBuzz', () => {
`
const FOOTER = '})\n'
const TESTS = [
  "  it('says 1 for 1', () => {\n    assert.equal(fizzbuzz(1), '1')\n  })\n",
  "  it('says 2 for 2', () => {\n    assert.equal(fizzbuzz(2), '2')\n  })\n",
  "  it('says Fizz for a multiple of 3', () => {\n    assert.equal(fizzbuzz(6), 'Fizz')\n  })\n",
  "  it('says Buzz for a multiple of 5', () => {\n    assert.equal(fizzbuzz(10), 'Buzz')\n  })\n",
  "  it('says FizzBuzz for every multiple of 15', () => {\n    forAll(integers({ min: 1, max: 10_000 }), (n) => fizzbuzz(15 * n) === 'FizzBuzz')\n  })\n",
]
const PROPERTIES = "const { forAll, integers } = require('./support/properties')\n"
// The property runner is imported by the cycle that needs it, not before.
const testsUpTo = (count) => HEADER.replace("fizzbuzz')\n", `fizzbuzz')\n${count === 5 ? PROPERTIES : ''}`)
  + TESTS.slice(0, count).join('\n') + FOOTER

const CODE = [
  "'use strict'\n\nconst fizzbuzz = () => '1'\n\nmodule.exports = { fizzbuzz }\n",
  "'use strict'\n\nconst fizzbuzz = (n) => String(n)\n\nmodule.exports = { fizzbuzz }\n",
  "'use strict'\n\nconst fizzbuzz = (n) => {\n  if (n % 3 === 0) return 'Fizz'\n  return String(n)\n}\n\nmodule.exports = { fizzbuzz }\n",
  "'use strict'\n\nconst fizzbuzz = (n) => {\n  if (n % 3 === 0) return 'Fizz'\n  if (n % 5 === 0) return 'Buzz'\n  return String(n)\n}\n\nmodule.exports = { fizzbuzz }\n",
]
const ITEMS = ['says 1 for 1', 'says 2 for 2', 'says Fizz for a multiple of 3', 'says Buzz for a multiple of 5',
  '[property] every multiple of 15 is FizzBuzz']

describe('Example: FizzBuzz, inside-out', () => {
  it('runs a full cycle end to end, with one property, and ends with the example files', () => {
    const s = session('fizzbuzz-inside-out')

    assert.equal(s.tdd('start', 'fizzbuzz', '--mode', 'inside-out').code, 0)
    s.write('.tdd/test-list.md', s.final('.tdd/test-list.md').replace(/- \[x\]/g, '- [ ]'))
    s.blocked('src/fizzbuzz.js', CODE[0], /LIST/)
    s.refused(/\/tdd:approve/)
    s.human('/tdd:approve')
    assert.equal(s.phase(), 'RED')

    for (let cycle = 0; cycle < 4; cycle++) {
      s.write('test/fizzbuzz.test.js', testsUpTo(cycle + 1))
      s.blocked('src/fizzbuzz.js', CODE[cycle], /RED/)
      s.next('GREEN')
      s.blocked('test/fizzbuzz.test.js', testsUpTo(cycle), /GREEN/)
      s.write('src/fizzbuzz.js', CODE[cycle])
      s.next('REFACTOR')
      s.refused(/Tick/)
      s.tick(ITEMS[cycle])
      s.next('RED')
    }

    s.blocked('test/fizzbuzz.test.js', testsUpTo(5).replace("it('says 2 for 2'", "it.skip('says 2 for 2'"), /disabled/)
    s.write('test/support/properties.js', s.final('test/support/properties.js'))
    s.write('test/fizzbuzz.test.js', testsUpTo(5))
    s.next('GREEN')
    s.write('src/fizzbuzz.js', s.final('src/fizzbuzz.js'))
    s.next('REFACTOR')
    s.tick(ITEMS[4])
    s.next('OFF')

    assert.equal(testsUpTo(5), s.final('test/fizzbuzz.test.js'))
    s.assertSameFilesAsExample(['src', 'test'])
    assert.equal(s.final('.tdd/test-list.md'), require('node:fs').readFileSync(`${s.root}/.tdd/test-list.md`, 'utf8'))
  })
})
