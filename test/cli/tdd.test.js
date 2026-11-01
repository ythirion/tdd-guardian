'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { hashTestCode } = require('../../scripts/lib/hash')
const { loadConfig } = require('../../scripts/lib/config')
const { saveState, loadState } = require('../../scripts/lib/state')
const { tdd, aTddProject, aProject, readJson, writeFile, GREEN_SUITE, RED_SUITE } = require('../helpers')

const phaseOf = (root) => readJson(root, '.tdd/state.json').phase
const OK = 0
const REFUSED = 1

describe('tdd.js start', () => {
  it('enters LIST with the requested mode and drafts a test-list skeleton', () => {
    const root = aTddProject({ phase: 'OFF' })

    const result = tdd(root, ['start', 'fizzbuzz', '--mode', 'inside-out'])

    assert.equal(result.code, OK, result.out)
    const state = readJson(root, '.tdd/state.json')
    assert.equal(state.phase, 'LIST')
    assert.equal(state.mode, 'inside-out')
    assert.equal(state.feature, 'fizzbuzz')
    assert.match(fs.readFileSync(path.join(root, '.tdd/test-list.md'), 'utf8'), /# Test list: fizzbuzz/)
  })
  it('uses defaultMode without --mode, and creates the config from the detected build file', () => {
    const root = aProject({ 'package.json': '{"name":"shop"}' })

    const result = tdd(root, ['start', 'shipping', 'fees'])

    assert.equal(result.code, OK, result.out)
    assert.equal(readJson(root, '.tdd/state.json').mode, 'outside-in')
    assert.equal(readJson(root, '.tdd/state.json').feature, 'shipping fees')
    assert.match(readJson(root, '.tdd/config.json').testCommand, /^npm test/)
    assert.match(result.out, /Created \.tdd\/config\.json \(node\)/)
  })
  it('refuses to change the mode outside OFF and LIST, and allows it in LIST', () => {
    const red = aTddProject({ phase: 'RED', mode: 'inside-out' })
    const list = aTddProject({ phase: 'LIST', mode: 'inside-out' })

    const refused = tdd(red, ['mode', 'outside-in'])
    assert.equal(refused.code, REFUSED)
    assert.match(refused.out, /mode can only change in OFF or LIST/)
    assert.equal(tdd(red, ['start', 'other', '--mode', 'outside-in']).code, REFUSED)
    assert.equal(readJson(red, '.tdd/state.json').mode, 'inside-out')

    assert.equal(tdd(list, ['mode', 'outside-in']).code, OK)
    assert.equal(readJson(list, '.tdd/state.json').mode, 'outside-in')
  })
})

describe('tdd.js approve', () => {
  it('refuses next in LIST: only a human approves the test list', () => {
    const root = aTddProject({ phase: 'LIST' })

    const result = tdd(root, ['next'])

    assert.equal(result.code, REFUSED)
    assert.match(result.out, /\/tdd:approve/)
    assert.equal(phaseOf(root), 'LIST')
  })

  it('inside-out: goes from LIST to RED and records the unit test count', () => {
    const root = aTddProject({ phase: 'LIST', mode: 'inside-out', files: { 'src/a.test.ts': "it('a', () => {})" } })

    const result = tdd(root, ['approve'])

    assert.equal(result.code, OK, result.out)
    assert.equal(phaseOf(root), 'RED')
    assert.equal(readJson(root, '.tdd/state.json').unitTestCountAtRed, 1)
  })
  it('outside-in: goes from LIST to ACCEPTANCE and records the acceptance test count', () => {
    const root = aTddProject({ phase: 'LIST', mode: 'outside-in' })

    assert.equal(tdd(root, ['approve']).code, OK)
    assert.equal(phaseOf(root), 'ACCEPTANCE')
    assert.equal(readJson(root, '.tdd/state.json').acceptanceTestCountAtAcceptance, 0)
  })

  it('refuses approve and off from an agent shell (CLAUDECODE set)', () => {
    const list = aTddProject({ phase: 'LIST' })
    const green = aTddProject({ phase: 'GREEN' })

    const approveByAgent = tdd(list, ['approve'], { CLAUDECODE: '1' })
    const offByAgent = tdd(green, ['off'], { CLAUDECODE: '1' })

    assert.equal(approveByAgent.code, REFUSED)
    assert.match(approveByAgent.out, /human/)
    assert.equal(offByAgent.code, REFUSED)
    assert.equal(phaseOf(list), 'LIST')
    assert.equal(phaseOf(green), 'GREEN')
  })
})

describe('tdd.js next: ACCEPTANCE to RED', () => {
  const inAcceptance = (files = {}, config = {}) => aTddProject({ phase: 'ACCEPTANCE', mode: 'outside-in',
    state: { acceptanceTestCountAtAcceptance: 0 }, config, files })
  const scenario = "it('free shipping above 50 euros', () => {})"

  it('needs exactly one new acceptance test, failing', () => {
    const none = tdd(inAcceptance(), ['next'])
    assert.equal(none.code, REFUSED)
    assert.match(none.out, /0 new acceptance tests/)

    const two = tdd(inAcceptance({ 'test/acceptance/shipping.test.ts': `${scenario}\n${scenario}` }), ['next'])
    assert.equal(two.code, REFUSED)
    assert.match(two.out, /2 new acceptance tests/)

    const passing = tdd(inAcceptance({ 'test/acceptance/shipping.test.ts': scenario }, { acceptanceCommand: GREEN_SUITE }), ['next'])
    assert.equal(passing.code, REFUSED)
    assert.match(passing.out, /acceptance test passes/)

    const root = inAcceptance({ 'test/acceptance/shipping.test.ts': scenario })
    const accepted = tdd(root, ['next'])
    assert.equal(accepted.code, OK, accepted.out)
    assert.equal(phaseOf(root), 'RED')
    assert.equal(readJson(root, '.tdd/state.json').acceptanceTest, 'test/acceptance/shipping.test.ts')
  })
})

describe('tdd.js next: RED to GREEN', () => {
  const oneNewTest = { 'src/fizzbuzz.test.ts': "it('says 1 for 1', () => expect(fizzbuzz(1)).toBe('1'))" }
  const inRed = ({ files = oneNewTest, config = {} } = {}) => aTddProject({ phase: 'RED', mode: 'inside-out',
    state: { unitTestCountAtRed: 0 }, config: { testCommand: RED_SUITE, ...config }, files: {
      '.tdd/test-list.md': '- [ ] says 1 for 1\n- [ ] says Fizz for 3\n', ...files } })

  it('refuses GREEN while the unit suite is green: the new test has not been seen failing', () => {
    const root = inRed({ config: { testCommand: GREEN_SUITE } })

    const result = tdd(root, ['next'])

    assert.equal(result.code, REFUSED)
    assert.match(result.out, /unit suite is green/)
    assert.equal(phaseOf(root), 'RED')
  })
  it('needs exactly one new failing test, then records the test-code hash and the current item', () => {
    const two = inRed({ files: { 'src/fizzbuzz.test.ts': "it('a', () => {})\nit('b', () => {})" } })
    const refused = tdd(two, ['next'])
    assert.equal(refused.code, REFUSED)
    assert.match(refused.out, /2 new unit tests/)

    const root = inRed()
    const accepted = tdd(root, ['next'])

    assert.equal(accepted.code, OK, accepted.out)
    const state = readJson(root, '.tdd/state.json')
    assert.equal(state.phase, 'GREEN')
    assert.equal(state.currentTest, 'says 1 for 1')
    assert.match(state.testFilesHashAtGreen, /^sha256:/)
    assert.equal(state.lastRun.unitGreen, false)
  })
})

// Puts a project in GREEN the way tdd.js does: the hash of the test code at that moment.
function inGreen({ config = {}, files = {} } = {}) {
  const root = aTddProject({ phase: 'GREEN', mode: 'inside-out', state: { currentTest: 'says 1 for 1' }, config, files: {
    'src/fizzbuzz.test.ts': "it('says 1 for 1', () => expect(fizzbuzz(1)).toBe('1'))",
    'test/fakes/clock.ts': 'export const NOW = 0', ...files } })
  saveState(root, { ...loadState(root), testFilesHashAtGreen: hashTestCode(root, loadConfig(root)) })
  return root
}

describe('tdd.js next: GREEN to REFACTOR', () => {
  it('refuses REFACTOR while the unit suite is red', () => {
    const root = inGreen({ config: { testCommand: RED_SUITE } })

    const result = tdd(root, ['next'])

    assert.equal(result.code, REFUSED)
    assert.match(result.out, /unit suite is red/)
  })

  it('refuses REFACTOR when a test or a Fake changed in GREEN, accepts it otherwise and records the assertion count', () => {
    const tampered = inGreen()
    writeFile(tampered, 'test/fakes/clock.ts', 'export const NOW = 1')
    const refused = tdd(tampered, ['next'])
    assert.equal(refused.code, REFUSED)
    assert.match(refused.out, /test code changed during GREEN/)

    const root = inGreen()
    const accepted = tdd(root, ['next'])
    assert.equal(accepted.code, OK, accepted.out)
    assert.equal(phaseOf(root), 'REFACTOR')
    assert.equal(readJson(root, '.tdd/state.json').assertionCountAtRefactor, 1)
  })
})

const twoAssertions = "it('says Fizz for 3', () => {\n  expect(fizzbuzz(3)).toBe('Fizz')\n  expect(fizzbuzz(6)).toBe('Fizz')\n})"
function inRefactor({ mode = 'inside-out', list = '- [x] says Fizz for 3\n- [ ] says Buzz for 5\n', config = {}, files = {}, state = {} } = {}) {
  return aTddProject({ phase: 'REFACTOR', mode, config,
    state: { currentTest: 'says Fizz for 3', assertionCountAtRefactor: 2, ...state },
    files: { '.tdd/test-list.md': list, 'src/fizzbuzz.test.ts': twoAssertions, ...files } })
}

describe('tdd.js next: leaving REFACTOR', () => {
  it('refuses with a red suite, a lower assertion count, or the current item not ticked', () => {
    const red = tdd(inRefactor({ config: { testCommand: RED_SUITE } }), ['next'])
    assert.equal(red.code, REFUSED)
    assert.match(red.out, /unit suite is red/)

    const weaker = tdd(inRefactor({ files: { 'src/fizzbuzz.test.ts': "it('says Fizz for 3', () => expect(fizzbuzz(3)).toBe('Fizz'))" } }), ['next'])
    assert.equal(weaker.code, REFUSED)
    assert.match(weaker.out, /assertion count dropped from 2 to 1/)

    const unticked = tdd(inRefactor({ list: '- [ ] says Fizz for 3\n- [ ] says Buzz for 5\n' }), ['next'])
    assert.equal(unticked.code, REFUSED)
    assert.match(unticked.out, /Tick "says Fizz for 3"/)
  })
  it('accepts extracting three assertions into a business assertion matching assertionMethodPatterns', () => {
    const root = inRefactor({
      state: { assertionCountAtRefactor: 3 },
      config: { assertionMethodPatterns: ['\\.(should|contient|aÉmis)\\w*\\('], testFilePatterns: ['**/*.test.ts', 'test/**'] },
      files: {
        'src/fizzbuzz.test.ts': "it('says Fizz for 3', () => {\n  laPartie(saved)\n    .contientLeChasseurAvec('Bernard', 7, 1)\n})",
        'test/assertions/partie.ts': "export const laPartie = (p) => ({\n  contientLeChasseurAvec(nom, balles, galinettes) {\n"
          + "    const c = p.chasseurs.find((x) => x.nom === nom)\n    expect(c.balles).toBe(balles)\n    expect(c.galinettes).toBe(galinettes)\n"
          + "    return this\n  },\n})",
      },
    })

    const result = tdd(root, ['next'])

    assert.equal(result.code, OK, result.out)
  })
  it('inside-out: goes back to RED while items remain, to OFF when every item is ticked', () => {
    const itemsLeft = inRefactor()
    assert.equal(tdd(itemsLeft, ['next']).code, OK)
    assert.equal(phaseOf(itemsLeft), 'RED')

    const allDone = inRefactor({ list: '- [x] says 1 for 1\n- [x] says Fizz for 3\n' })
    const result = tdd(allDone, ['next'])
    assert.equal(result.code, OK, result.out)
    assert.equal(phaseOf(allDone), 'OFF')
    assert.match(result.out, /every item is ticked/)
  })
})

describe('tdd.js next: outside-in double loop', () => {
  const twoScenarios = [
    '- [ ] Scenario: free shipping above 50 euros',
    '  - [x] says Fizz for 3',
    '  - [ ] an order worth 60 has no fees',
    '- [ ] Scenario: 5 euros below 50 euros',
    '',
  ].join('\n')
  const outsideIn = (acceptanceCommand, list = twoScenarios) => inRefactor({ mode: 'outside-in', list,
    config: { acceptanceCommand }, state: { currentScenario: 'Scenario: free shipping above 50 euros' } })

  it('goes back to RED while the acceptance test is red', () => {
    const root = outsideIn(RED_SUITE)

    const result = tdd(root, ['next'])

    assert.equal(result.code, OK, result.out)
    assert.equal(phaseOf(root), 'RED')
    assert.match(result.out, /acceptance test still red/)
  })

  it('goes to ACCEPTANCE once the acceptance test is green with scenarios left, ticking the scenario', () => {
    const root = outsideIn(GREEN_SUITE)

    const result = tdd(root, ['next'])

    assert.equal(result.code, OK, result.out)
    assert.equal(phaseOf(root), 'ACCEPTANCE')
    assert.match(fs.readFileSync(path.join(root, '.tdd/test-list.md'), 'utf8'), /- \[x\] Scenario: free shipping above 50 euros/)
  })

  it('goes to OFF when every scenario is green and every item ticked', () => {
    const lastScenario = '- [x] Scenario: free shipping above 50 euros\n  - [x] says Fizz for 3\n- [ ] Scenario: 5 euros below 50 euros\n'
    const root = inRefactor({ mode: 'outside-in', list: lastScenario, config: { acceptanceCommand: GREEN_SUITE },
      state: { currentScenario: 'Scenario: 5 euros below 50 euros' } })

    const result = tdd(root, ['next'])

    assert.equal(result.code, OK, result.out)
    assert.equal(phaseOf(root), 'OFF')
  })
})

describe('tdd.js refusals', () => {
  it('say which phase you are still in, before the reason and the action', () => {
    const result = tdd(inRefactor({ config: { testCommand: RED_SUITE } }), ['next'])

    assert.match(result.out, /^tdd\.js next refused \(still in REFACTOR\): The unit suite is red/)
  })
})

describe('tdd.js status', () => {
  it('shows mode, phase, current and acceptance tests, progress, last run, justified mocks and the review checklist', () => {
    const root = aTddProject({ phase: 'GREEN', mode: 'outside-in', files: {
      '.tdd/test-list.md': '- [ ] Scenario: free shipping\n  - [x] a\n  - [ ] b\n' }, state: {
      currentTest: 'b', acceptanceTest: 'test/acceptance/shipping.test.ts',
      lastRun: { unitGreen: false, acceptanceGreen: false, at: '2026-11-01T10:12:00Z' },
      justifiedMocks: [{ file: 'test/notify.test.ts', line: 18, reason: 'third-party SDK with no port' }] } })

    const { code, out } = tdd(root, ['status'])

    assert.equal(code, OK)
    for (const expected of [/Mode: outside-in/, /Phase: GREEN/, /Current test: b/, /Acceptance test: test\/acceptance\/shipping\.test\.ts/,
      /Unit items: 1\/2 ticked/, /Scenarios: 0\/1 green/, /unit red, acceptance red/,
      /test\/notify\.test\.ts:18 third-party SDK with no port/, /Would I understand this test in five seconds/]) {
      assert.match(out, expected)
    }
  })
})

describe('tdd.js commits', () => {
  const { execSync } = require('node:child_process')
  const git = (root, args) => execSync(`git ${args}`, { cwd: root, encoding: 'utf8' }).trim()

  it('commits at the end of REFACTOR with a Conventional Commit message when the project is a git repo', () => {
    const root = inRefactor({ config: { commitOnRefactor: true } })
    git(root, 'init -q && git config user.email t@example.com && git config user.name Test && git add -A && git commit -qm init')
    writeFile(root, 'src/fizzbuzz.ts', "export const fizzbuzz = (n) => (n % 3 === 0 ? 'Fizz' : String(n))")

    assert.equal(tdd(root, ['next']).code, OK)

    assert.equal(git(root, 'log -1 --format=%s'), 'feat(shipping-fees): says Fizz for 3')
    assert.equal(git(root, 'status --porcelain'), '')
  })
})

describe('tdd.js mutate', () => {
  it('runs mutationCommand on the production files touched, prints an install hint when the tool is missing, never fails', () => {
    const touchedFiles = ['src/shipping.ts', 'src/shipping.test.ts', 'src/fees.ts']
    const echo = 'node -e "console.log(\'mutating \' + process.argv[1])" {files}'
    const root = aTddProject({ phase: 'REFACTOR', config: { mutationCommand: echo }, state: { touchedFiles } })
    const missing = aTddProject({ phase: 'REFACTOR', config: { mutationCommand: 'no-such-mutation-tool-xyz run {files}' }, state: { touchedFiles } })

    const run = tdd(root, ['mutate'])
    const notInstalled = tdd(missing, ['mutate'])

    assert.equal(run.code, OK)
    assert.match(run.out, /mutating src\/shipping\.ts,src\/fees\.ts/)
    assert.match(run.out, /side effect/)
    assert.equal(notInstalled.code, OK)
    assert.match(notInstalled.out, /not installed/)
  })
})
