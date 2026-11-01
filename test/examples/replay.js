'use strict'
// Replays a TDD session on a copy of an example, through the real hooks and tdd.js,
// the way Claude Code would call them.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { runHook, tdd, toolCall, readJson } = require('../helpers')

const { spawnSync } = require('node:child_process')

const EXAMPLES = path.join(__dirname, '..', '..', 'examples')

// The Java examples run their real Maven build; without Maven they are skipped, not failed.
const MAVEN_MISSING = spawnSync('mvn', ['-v'], { shell: true }).status === 0 ? false : 'Maven is not installed'

// A fresh project holding only the example's build file and TDD config, as before /tdd:start.
function session(example, buildFiles = ['pom.xml']) {
  const exampleDir = path.join(EXAMPLES, example)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `tdd-${example}-`))
  fs.mkdirSync(path.join(root, '.tdd'))
  for (const file of ['.tdd/config.json', ...buildFiles]) fs.copyFileSync(path.join(exampleDir, file), path.join(root, file))

  const phase = () => readJson(root, '.tdd/state.json').phase
  const attempt = (rel, content) => runHook('guard-write.js',
    toolCall(root, 'Write', { file_path: path.join(root, rel), content }))
  const s = {
    root,
    phase,
    // The example's final version of a file.
    final: (rel) => fs.readFileSync(path.join(exampleDir, rel), 'utf8'),
    // The agent writes: the hook must let it through, then the tool writes the file.
    write(rel, content) {
      const verdict = attempt(rel, content)
      assert.equal(verdict.code, 0, `write ${rel} in ${phase()}:\n${verdict.stderr}`)
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
      fs.writeFileSync(path.join(root, rel), content)
    },
    blocked(rel, content, reason) {
      const verdict = attempt(rel, content)
      assert.equal(verdict.code, 2, `${rel} should be blocked in ${phase()}`)
      assert.match(verdict.stderr, reason)
    },
    tick(item) {
      const list = fs.readFileSync(path.join(root, '.tdd/test-list.md'), 'utf8')
      assert.ok(list.includes(`- [ ] ${item}`), `item "${item}" is in the list`)
      s.write('.tdd/test-list.md', list.replace(`- [ ] ${item}`, `- [x] ${item}`))
    },
    tdd: (...args) => tdd(root, args),
    next(expected) {
      const result = tdd(root, ['next'])
      assert.equal(result.code, 0, `next from ${phase()}:\n${result.out}`)
      assert.equal(phase(), expected, result.out)
      return result
    },
    refused(pattern) {
      const before = phase()
      const result = tdd(root, ['next'])
      assert.equal(result.code, 1)
      assert.match(result.out, pattern)
      assert.equal(phase(), before)
    },
    human: (prompt) => runHook('human-gate.js', { hook_event_name: 'UserPromptSubmit', cwd: root, prompt }),
    // Every source and test file of the example must come out of the replay, byte for byte.
    assertSameFilesAsExample(dirs) {
      const list = (base, dir) => {
        const full = path.join(base, dir)
        if (!fs.existsSync(full)) return []
        return fs.readdirSync(full, { recursive: true }).map(String).filter((f) => !f.startsWith('target'))
          .filter((f) => fs.statSync(path.join(full, f)).isFile()).map((f) => path.join(dir, f).split(path.sep).join('/')).sort()
      }
      for (const dir of dirs) {
        assert.deepEqual(list(root, dir), list(exampleDir, dir), `files in ${dir}`)
        for (const file of list(exampleDir, dir)) {
          assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), s.final(file), file)
        }
      }
    },
  }
  return s
}

module.exports = { session, MAVEN_MISSING }
