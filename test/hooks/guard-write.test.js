'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, aWrite, anEdit } = require('../helpers')

const guardWrite = (payload) => runHook('guard-write.js', payload)
const ALLOWED = 0
const BLOCKED = 2

describe('guard-write: writes allowed per phase', () => {
  it('lets every file through in OFF', () => {
    const root = aTddProject({ phase: 'OFF' })

    for (const file of ['src/foo.ts', 'src/foo.test.ts', 'test/acceptance/shipping.test.ts']) {
      assert.equal(guardWrite(aWrite(root, file, 'x')).code, ALLOWED, file)
    }
  })
  it('blocks the plugin state in every phase, and says to go through tdd.js', () => {
    for (const phase of ['OFF', 'LIST', 'ACCEPTANCE', 'RED', 'GREEN', 'REFACTOR']) {
      const result = guardWrite(aWrite(aTddProject({ phase }), '.tdd/state.json', '{"phase":"OFF"}'))

      assert.equal(result.code, BLOCKED, phase)
      assert.match(result.stderr, /tdd\.js/)
    }
  })
  it('blocks an Edit on a unit test in GREEN, quoting the rule, the reason and the expected action', () => {
    const root = aTddProject({ phase: 'GREEN', files: { 'src/foo.test.ts': "it('a', () => expect(1).toBe(2))" } })

    const result = guardWrite(anEdit(root, 'src/foo.test.ts', 'toBe(2)', 'toBe(1)'))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /GREEN.*tests are read-only/)
    assert.match(result.stderr, /Why: /)
    assert.match(result.stderr, /Do instead: .*production code/)
  })
  it('blocks a Fake in GREEN, like a unit test', () => {
    const root = aTddProject({ phase: 'GREEN' })

    assert.equal(guardWrite(aWrite(root, 'test/fakes/in-memory-orders.ts', 'export class X {}')).code, BLOCKED)
  })

  it('blocks a builder in GREEN, like a Fake', () => {
    const root = aTddProject({ phase: 'GREEN' })

    assert.equal(guardWrite(aWrite(root, 'test/builders/order-builder.ts', 'export const anOrder = 1')).code, BLOCKED)
  })

  it('lets production code through in GREEN, but freezes the test list', () => {
    const root = aTddProject({ phase: 'GREEN' })

    assert.equal(guardWrite(aWrite(root, 'src/shipping.ts', 'export const fees = () => 0')).code, ALLOWED)
    const list = guardWrite(aWrite(root, '.tdd/test-list.md', '- [ ] next case'))
    assert.equal(list.code, BLOCKED)
    assert.match(list.stderr, /test list/)
  })
  it('blocks production code in RED, and the acceptance tests too', () => {
    const root = aTddProject({ phase: 'RED' })

    const result = guardWrite(aWrite(root, 'src/foo.ts', 'export const foo = 1'))
    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /RED.*no production code/)
    assert.equal(guardWrite(aWrite(root, 'test/acceptance/shipping.test.ts', 'x')).code, BLOCKED)
  })
  it('lets one new test and a builder through in RED', () => {
    const root = aTddProject({ phase: 'RED', state: { unitTestCountAtRed: 1 },
      files: { 'src/foo.test.ts': "it('one', () => {})" } })

    assert.equal(guardWrite(aWrite(root, 'src/foo.test.ts', "it('one', () => {})\nit('two', () => {})")).code, ALLOWED)
    assert.equal(guardWrite(aWrite(root, 'test/builders/order-builder.ts', 'export const anOrder = 1')).code, ALLOWED)
  })
  it('blocks code and tests in LIST, and lets the test list through', () => {
    const root = aTddProject({ phase: 'LIST' })

    for (const file of ['src/foo.ts', 'src/foo.test.ts', 'test/acceptance/shipping.test.ts']) {
      const result = guardWrite(aWrite(root, file, 'x'))
      assert.equal(result.code, BLOCKED, file)
      assert.match(result.stderr, /LIST.*approve/)
    }
    assert.equal(guardWrite(aWrite(root, '.tdd/test-list.md', '- [ ] free above 50')).code, ALLOWED)
  })
})

describe('guard-write: one test at a time', () => {
  const oneTest = "it('one', () => {})"
  const RED_WITH_ONE_TEST = { phase: 'RED', state: { unitTestCountAtRed: 1 }, files: { 'src/foo.test.ts': oneTest } }

  it('blocks adding two tests at once in one file', () => {
    const root = aTddProject(RED_WITH_ONE_TEST)

    const result = guardWrite(aWrite(root, 'src/foo.test.ts', `${oneTest}\nit('two', () => {})\nit('three', () => {})`))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /one test at a time/)
    assert.match(result.stderr, /2 new tests/)
  })

  it('blocks a second new test written in another file', () => {
    const root = aTddProject({ ...RED_WITH_ONE_TEST,
      files: { 'src/foo.test.ts': oneTest, 'src/bar.test.ts': "it('new one', () => {})" } })

    assert.equal(guardWrite(aWrite(root, 'src/baz.test.ts', "it('another new one', () => {})")).code, BLOCKED)
  })
  it('counts one new property as exactly one new test', () => {
    const root = aTddProject(RED_WITH_ONE_TEST)
    const property = "it('every multiple of 15 is FizzBuzz', () => {\n  fc.assert(fc.property(fc.integer(), (n) => fizzbuzz(15 * n) === 'FizzBuzz'))\n})"

    assert.equal(guardWrite(aWrite(root, 'src/foo.test.ts', `${oneTest}\n${property}`)).code, ALLOWED)
    assert.equal(guardWrite(aWrite(root, 'test/Unit/FizzBuzzTest.cs', '[Property]\npublic Property P() => Prop.ForAll(...);')).code, ALLOWED)
  })

  it('blocks a test disabled with it.skip(', () => {
    const root = aTddProject(RED_WITH_ONE_TEST)

    const result = guardWrite(anEdit(root, 'src/foo.test.ts', "it('one'", "it.skip('one'"))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /it\.skip\(/)
    assert.match(result.stderr, /never disabled/)
  })
})

describe('guard-write: outside-in ACCEPTANCE phase', () => {
  const ACCEPTANCE = { phase: 'ACCEPTANCE', mode: 'outside-in', state: { acceptanceTestCountAtAcceptance: 0 } }

  it('blocks unit tests and production code, lets one acceptance test through, blocks two', () => {
    const root = aTddProject(ACCEPTANCE)

    const unit = guardWrite(aWrite(root, 'src/shipping.test.ts', "it('a', () => {})"))
    assert.equal(unit.code, BLOCKED)
    assert.match(unit.stderr, /ACCEPTANCE/)
    assert.equal(guardWrite(aWrite(root, 'src/shipping.ts', 'x')).code, BLOCKED)
    assert.equal(guardWrite(aWrite(root, 'test/acceptance/shipping.test.ts', "it('free above 50', () => {})")).code, ALLOWED)
    assert.equal(guardWrite(aWrite(root, 'test/acceptance/shipping.test.ts',
      "it('free above 50', () => {})\nit('5 euros below', () => {})")).code, BLOCKED)
  })
})

describe('guard-write: GREEN, REFACTOR and free files', () => {
  it('blocks the acceptance tests in GREEN', () => {
    const root = aTddProject({ phase: 'GREEN', mode: 'outside-in' })

    assert.equal(guardWrite(aWrite(root, 'test/acceptance/shipping.test.ts', 'x')).code, BLOCKED)
  })

  it('lets production, unit tests and acceptance tests through in REFACTOR', () => {
    const root = aTddProject({ phase: 'REFACTOR', mode: 'outside-in' })

    for (const file of ['src/foo.ts', 'src/foo.test.ts', 'test/fakes/orders.ts', 'test/acceptance/shipping.test.ts']) {
      assert.equal(guardWrite(aWrite(root, file, "it('a', () => {})\nit('b', () => {})")).code, ALLOWED, file)
    }
  })

  it('lets README.md through in every phase', () => {
    for (const phase of ['OFF', 'LIST', 'ACCEPTANCE', 'RED', 'GREEN', 'REFACTOR']) {
      assert.equal(guardWrite(aWrite(aTddProject({ phase }), 'README.md', '# Shop')).code, ALLOWED, phase)
    }
  })
})
