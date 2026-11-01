'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { aProject } = require('../helpers')
const { loadConfig, detectConfig } = require('../../scripts/lib/config')

describe('Project configuration', () => {
  it('uses the defaults when the project has no .tdd/config.json', () => {
    const config = loadConfig(aProject())

    assert.equal(config.defaultMode, 'outside-in')
    assert.equal(config.strict, true)
    assert.deepEqual(config.mockPolicy, { 'inside-out': 'allow', 'outside-in': 'justify' })
  })
  it('lets a project override the defaults key by key, mock policy per mode', () => {
    const root = aProject({
      '.tdd/config.json': { defaultMode: 'inside-out', mockPolicy: { 'outside-in': 'forbid' } },
    })

    const config = loadConfig(root)

    assert.equal(config.defaultMode, 'inside-out')
    assert.equal(config.strict, true)
    assert.deepEqual(config.mockPolicy, { 'inside-out': 'allow', 'outside-in': 'forbid' })
  })
  it('proposes a config from the build file it finds: package.json, pom.xml, pyproject.toml, *.csproj', () => {
    const detected = (files) => detectConfig(aProject(files))

    assert.equal(detected({ 'package.json': '{}' }).ecosystem, 'node')
    assert.equal(detected({ 'pom.xml': '<project/>' }).ecosystem, 'maven')
    assert.equal(detected({ 'pyproject.toml': '' }).ecosystem, 'python')
    assert.equal(detected({ 'Shop/Shop.csproj': '<Project/>' }).ecosystem, 'dotnet')
    assert.equal(detected({}), null)
    assert.match(detected({ 'pom.xml': '' }).config.testCommand, /mvn/)
  })
})
