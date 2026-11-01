'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { runHook, aTddProject, toolCall } = require('../helpers')

const ALLOWED = 0
const BLOCKED = 2
const bash = (root, command) => runHook('guard-bash.js', toolCall(root, 'Bash', { command }))
const inGreen = () => aTddProject({ phase: 'GREEN', files: { 'src/foo.test.ts': "it('a', () => expect(1).toBe(2))", 'src/foo.ts': '' } })

describe('guard-bash', () => {
  it('blocks sed -i on a test file in GREEN', () => {
    const result = bash(inGreen(), "sed -i '' 's/toBe(2)/toBe(1)/' src/foo.test.ts")

    assert.equal(result.code, BLOCKED)
    assert.match(result.stderr, /GREEN, tests are read-only/)
    assert.match(result.stderr, /src\/foo\.test\.ts/)
  })
  it('blocks redirections, tee, cp, mv, rm, git checkout and git restore on a test file in GREEN', () => {
    const root = inGreen()

    for (const command of [
      "echo \"it('a', () => {})\" > src/foo.test.ts",
      'echo x >> src/foo.test.ts',
      'npm test 2>&1 | tee -a src/foo.test.ts',
      'cp /tmp/old.ts src/foo.test.ts',
      'mv src/foo.test.ts /tmp/',
      'rm -f src/foo.test.ts',
      'git checkout HEAD~1 -- src/foo.test.ts',
      'git restore src/foo.test.ts',
      'cd src && sed -i.bak s/2/1/ foo.test.ts',
    ]) {
      assert.equal(bash(root, command).code, BLOCKED, command)
    }
  })
  it('lets through running the tests, reading a test file, and writing outside the project', () => {
    const root = inGreen()
    const red = aTddProject({ phase: 'RED' })

    for (const command of ['npm test 2>&1 | tail -20', 'cat src/foo.test.ts', 'grep -n expect src/foo.test.ts > /dev/null',
      'git checkout -b feature/shipping', 'echo done > src/foo.ts']) {
      assert.equal(bash(root, command).code, ALLOWED, command)
    }
    assert.equal(bash(red, 'npm test > /tmp/tdd-run.txt 2>&1').code, ALLOWED)
  })
  it('blocks any agent call to tdd.js off or tdd.js approve, in every phase', () => {
    for (const phase of ['OFF', 'LIST', 'GREEN']) {
      const root = aTddProject({ phase })
      const off = bash(root, 'node ~/.claude/plugins/tdd/scripts/tdd.js off')

      assert.equal(off.code, BLOCKED, phase)
      assert.match(off.stderr, /reserved for the human/)
      assert.equal(bash(root, 'cd /x && node "scripts/tdd.js"  approve').code, BLOCKED, phase)
    }
  })

  it('blocks writes into .tdd/ in every phase, and lets tdd.js next through', () => {
    for (const phase of ['OFF', 'RED', 'REFACTOR']) {
      const root = aTddProject({ phase })

      assert.equal(bash(root, `echo '{"phase":"OFF"}' > .tdd/state.json`).code, BLOCKED, phase)
      assert.equal(bash(root, 'rm -rf .tdd').code, BLOCKED, phase)
      assert.equal(bash(root, 'node scripts/tdd.js next').code, ALLOWED, phase)
    }
  })
  it('with strict: false, warns without blocking', () => {
    const root = aTddProject({ phase: 'GREEN', config: { strict: false }, files: { 'src/foo.test.ts': 'x' } })

    const result = bash(root, "sed -i '' s/x/y/ src/foo.test.ts")

    assert.equal(result.code, ALLOWED)
    assert.match(result.stderr, /warning \(strict: false\)/)
  })
})
