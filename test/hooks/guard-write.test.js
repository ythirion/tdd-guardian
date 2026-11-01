'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, aWrite, anEdit, readJson, toolCall } = require('../helpers')
const path = require('node:path')

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

describe('guard-write: mock policy', () => {
  const RED_OUTSIDE_IN = { phase: 'RED', mode: 'outside-in', state: { unitTestCountAtRed: 0 } }
  const aTestWith = (line) => `it('places the order', () => {\n  ${line}\n})`

  it('outside-in, justify: blocks a new jest.fn() without a reason and suggests a Fake', () => {
    const root = aTddProject(RED_OUTSIDE_IN)

    const result = guardWrite(aWrite(root, 'src/order.test.ts', aTestWith('const save = jest.fn()')))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /jest\.fn\(\)/)
    assert.match(result.stderr, /references\/fakes\.md/)
    assert.match(result.stderr, /Fake/)
    assert.match(result.stderr, /tdd-guardian: allow-mock <reason>/)
  })
  it('outside-in, justify: lets a mock with a reason through and records it for review', () => {
    const root = aTddProject(RED_OUTSIDE_IN)

    const result = guardWrite(aWrite(root, 'src/notify.test.ts',
      aTestWith('const sdk = jest.fn() // tdd-guardian: allow-mock third-party SDK with no port')))

    assert.equal(result.code, ALLOWED)
    assert.deepEqual(readJson(root, '.tdd/state.json').justifiedMocks,
      [{ file: 'src/notify.test.ts', line: 2, reason: 'third-party SDK with no port' }])
  })
  it('forbid: blocks a mock even with a reason', () => {
    const root = aTddProject({ ...RED_OUTSIDE_IN, config: { mockPolicy: { 'outside-in': 'forbid' } } })

    const result = guardWrite(aWrite(root, 'src/notify.test.ts',
      aTestWith('const sdk = jest.fn() // tdd-guardian: allow-mock third-party SDK with no port')))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /forbid/)
  })

  it('inside-out, allow: lets jest.fn() through without a reason', () => {
    const root = aTddProject({ phase: 'RED', mode: 'inside-out', state: { unitTestCountAtRed: 0 } })

    assert.equal(guardWrite(aWrite(root, 'src/order.test.ts', aTestWith('const save = jest.fn()'))).code, ALLOWED)
  })
})

describe('guard-write: every editing tool', () => {
  const oneTest = "it('one', () => {})"
  const RED = { phase: 'RED', state: { unitTestCountAtRed: 2 }, files: { 'src/foo.test.ts': oneTest, 'test/explore.ipynb': oneTest } }

  it('rebuilds the proposed content of Edit (replace_all), MultiEdit and NotebookEdit', () => {
    const root = aTddProject(RED)
    const at = (file) => path.join(root, file)

    const replaceAll = toolCall(root, 'Edit', { file_path: at('src/foo.test.ts'), old_string: '{}', new_string: "{})\nit('x', () => {}", replace_all: true })
    const multi = toolCall(root, 'MultiEdit', { file_path: at('src/foo.test.ts'), edits: [
      { old_string: oneTest, new_string: `${oneTest}\nit('two', () => {})` },
      { old_string: "it('two'", new_string: "it('three', () => {})\nit('two'" },
    ] })
    const notebook = toolCall(root, 'NotebookEdit', { notebook_path: at('test/explore.ipynb'), new_source: "it('a', () => {})\nit('b', () => {})" })

    assert.equal(guardWrite(replaceAll).code, ALLOWED)
    assert.equal(guardWrite(multi).code, BLOCKED)
    assert.equal(guardWrite(notebook).code, BLOCKED)
  })
})

describe('guard-write: session bookkeeping', () => {
  it('records every file written during the session in touchedFiles, once', () => {
    const root = aTddProject({ phase: 'GREEN' })

    guardWrite(aWrite(root, 'src/shipping.ts', 'a'))
    guardWrite(aWrite(root, 'src/shipping.ts', 'b'))
    guardWrite(aWrite(root, 'src/shipping.test.ts', 'blocked in GREEN'))

    assert.deepEqual(readJson(root, '.tdd/state.json').touchedFiles, ['src/shipping.ts'])
  })
})

describe('guard-write: never in the way when it should not be', () => {
  it('with strict: false, warns on stderr and lets the write through', () => {
    const root = aTddProject({ phase: 'GREEN', config: { strict: false } })

    const result = guardWrite(aWrite(root, 'src/foo.test.ts', 'x'))

    assert.equal(result.code, ALLOWED)
    assert.match(result.stderr, /warning \(strict: false\)/)
    assert.match(result.stderr, /tests are read-only/)
  })

  it('lets the tool through on unreadable input, or in a project that never used the plugin', () => {
    const { aProject } = require('../helpers')
    const root = aProject({ 'src/foo.test.ts': 'x' })

    assert.equal(guardWrite('not json').code, ALLOWED)
    assert.equal(guardWrite(aWrite(root, 'src/foo.test.ts', 'y')).code, ALLOWED)
    assert.equal(guardWrite(aWrite(root, '.tdd/notes.md', 'y')).code, ALLOWED)
  })
})

// GitHub Copilot CLI sends every file creation and edit as its Edit tool with an apply_patch string
// (captured from Copilot CLI 1.0.105). Paths are relative to the project.
describe('guard-write: GitHub Copilot apply_patch payloads', () => {
  const aPatch = (root, ...lines) => toolCall(root, 'Edit', ['*** Begin Patch', ...lines, '*** End Patch', ''].join('\n'))
  const oneTest = "it('one', () => {})"
  const RED_WITH_ONE_TEST = { phase: 'RED', state: { unitTestCountAtRed: 1 }, files: { 'src/foo.test.ts': `${oneTest}\n` } }

  it('blocks a patch on a unit test in GREEN, with the same lesson', () => {
    const root = aTddProject({ phase: 'GREEN', files: { 'src/foo.test.ts': "it('a', () => expect(1).toBe(2))\n" } })

    const result = guardWrite(aPatch(root, '*** Update File: src/foo.test.ts', '@@', "-it('a', () => expect(1).toBe(2))", "+it('a', () => expect(1).toBe(1))"))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /GREEN.*tests are read-only/)
  })
  it('blocks a patch adding production code in RED, and lets a patch adding one test through', () => {
    const root = aTddProject(RED_WITH_ONE_TEST)

    assert.equal(guardWrite(aPatch(root, '*** Add File: src/foo.ts', '+export const foo = 1')).code, BLOCKED)
    assert.equal(guardWrite(aPatch(root, '*** Update File: src/foo.test.ts', '@@', ` ${oneTest}`, "+it('two', () => {})")).code, ALLOWED)
  })
  it('blocks a patch adding two tests at once in RED', () => {
    const root = aTddProject(RED_WITH_ONE_TEST)

    const result = guardWrite(aPatch(root, '*** Update File: src/foo.test.ts', '@@', ` ${oneTest}`, "+it('two', () => {})", "+it('three', () => {})"))

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /one test at a time/)
  })
  it('checks every file of a multi-file patch: production code with a test in GREEN is blocked', () => {
    const root = aTddProject({ phase: 'GREEN', files: { 'src/foo.test.ts': `${oneTest}\n` } })

    const both = aPatch(root, '*** Add File: src/foo.ts', '+export const foo = 1', '*** Update File: src/foo.test.ts', '@@', `-${oneTest}`)
    assert.equal(guardWrite(both).code, BLOCKED)
    assert.equal(guardWrite(aPatch(root, '*** Add File: src/foo.ts', '+export const foo = 1')).code, ALLOWED)
  })
  it('blocks deleting or moving away a unit test in GREEN', () => {
    const root = aTddProject({ phase: 'GREEN', files: { 'src/foo.test.ts': `${oneTest}\n` } })

    assert.equal(guardWrite(aPatch(root, '*** Delete File: src/foo.test.ts')).code, BLOCKED)
    assert.equal(guardWrite(aPatch(root, '*** Update File: src/foo.ts', '*** Move to: src/foo.test.ts', '@@', '+x')).code, BLOCKED)
  })
  it('records every patched file in touchedFiles', () => {
    const root = aTddProject({ phase: 'GREEN' })

    guardWrite(aPatch(root, '*** Add File: src/a.ts', '+a', '*** Add File: src/b.ts', '+b'))

    assert.deepEqual(readJson(root, '.tdd/state.json').touchedFiles, ['src/a.ts', 'src/b.ts'])
  })
})
