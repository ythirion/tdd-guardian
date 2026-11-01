'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..', '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))

// Minimal YAML frontmatter reader: `key: value` lines between the first two `---`.
function frontmatter(rel) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(read(rel))
  assert.ok(match, `${rel} has frontmatter`)
  return Object.fromEntries(match[1].split('\n').filter((l) => /^\w[\w-]*:/.test(l))
    .map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]))
}

describe('Plugin packaging', () => {
  it('has a manifest named tdd and hooks wired to scripts that exist', () => {
    const manifest = JSON.parse(read('.claude-plugin/plugin.json'))
    const { hooks } = JSON.parse(read('hooks/hooks.json'))

    assert.equal(manifest.name, 'tdd')
    assert.ok(manifest.version && manifest.description && manifest.author.name)
    const wired = Object.entries(hooks).flatMap(([event, groups]) =>
      groups.flatMap((group) => group.hooks.map((hook) => ({ event, matcher: group.matcher, hook }))))
    const scriptOf = ({ hook }) => hook.args[0].replace('${CLAUDE_PLUGIN_ROOT}/', '')
    for (const entry of wired) {
      assert.equal(entry.hook.command, 'node')
      assert.ok(exists(scriptOf(entry)), scriptOf(entry))
    }
    const find = (script) => wired.find((e) => scriptOf(e) === `scripts/${script}`)
    assert.equal(find('guard-write.js').matcher, 'Write|Edit|MultiEdit|NotebookEdit')
    assert.equal(find('guard-bash.js').matcher, 'Bash')
    assert.equal(find('guard-read.js').matcher, 'Read|Grep|Glob|Bash')
    assert.equal(find('check-stop.js').event, 'Stop')
    assert.equal(find('session-start.js').event, 'SessionStart')
    assert.equal(find('human-gate.js').event, 'UserPromptSubmit')
  })

  it('ships the six commands, approve and off out of the model reach', () => {
    for (const name of ['start', 'approve', 'next', 'status', 'mutate', 'off']) {
      const meta = frontmatter(`commands/${name}.md`)
      assert.ok(meta.description, name)
      assert.equal(meta['disable-model-invocation'] === 'true', ['approve', 'off'].includes(name), name)
    }
  })

  it('has a skill under 200 lines, triggered on TDD vocabulary, linking every reference that exists', () => {
    const skill = read('skills/tdd/SKILL.md')
    const meta = frontmatter('skills/tdd/SKILL.md')

    assert.ok(skill.split('\n').length < 200)
    for (const trigger of ['TDD', 'test first', 'red green refactor', 'inside-out', 'outside-in', '.tdd/state.json']) {
      assert.match(meta.description, new RegExp(trigger.replace(/[.]/g, '\\.'), 'i'), trigger)
    }
    const references = ['cycle', 'green-moves', 'inside-out', 'outside-in', 'fakes', 'naming-and-organization',
      'test-data-builders', 'business-assertions', 'property-based']
    for (const reference of references) {
      assert.ok(exists(`skills/tdd/references/${reference}.md`), reference)
      assert.ok(skill.includes(`references/${reference}.md`), `SKILL.md links ${reference}`)
    }
  })

  it('gives each agent a restricted tool list', () => {
    const tools = (name) => frontmatter(`agents/${name}.md`).tools.split(/,\s*/)

    for (const name of ['tdd-tester', 'tdd-implementer', 'tdd-refactorer']) {
      assert.equal(frontmatter(`agents/${name}.md`).name, name)
      assert.ok(!tools(name).includes('Agent') && !tools(name).includes('WebFetch'), name)
    }
    assert.ok(!tools('tdd-implementer').includes('NotebookEdit'))
  })
})
