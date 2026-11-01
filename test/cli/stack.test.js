'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { tdd, aProject, aTddProject, readJson, runHook } = require('../helpers')

const OK = 0
const SPRING_POM = `<project>
  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId></parent>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId></dependency>
    <dependency><groupId>org.assertj</groupId><artifactId>assertj-core</artifactId></dependency>
  </dependencies>
</project>`
const detect = (root) => {
  const result = tdd(root, ['detect'])
  assert.equal(result.code, OK, result.out)
  return JSON.parse(result.out)
}

describe('tdd.js detect: the stack the project already declares, to pre-select the answers of /tdd:start', () => {
  it('reads Java, JUnit 5 + AssertJ and Spring Boot from a pom.xml', () => {
    assert.deepEqual(detect(aProject({ 'pom.xml': SPRING_POM })),
      { language: 'Java', testing: 'JUnit 5 + AssertJ', additional: 'Spring Boot', build: 'maven' })
  })
  it('reads TypeScript, Vitest + fast-check and Express from a package.json', () => {
    const root = aProject({ 'tsconfig.json': '{}', 'package.json': JSON.stringify({
      dependencies: { express: '^5' }, devDependencies: { typescript: '^5', vitest: '^3', 'fast-check': '^4' } }) })

    assert.deepEqual(detect(root), { language: 'TypeScript', testing: 'Vitest + fast-check', additional: 'Express', build: 'npm' })
  })
  it('reads Python, pytest + Hypothesis and FastAPI from a pyproject.toml', () => {
    const root = aProject({ 'pyproject.toml': '[project]\ndependencies = ["fastapi"]\n[dependency-groups]\ndev = ["pytest", "hypothesis"]\n' })

    assert.deepEqual(detect(root), { language: 'Python', testing: 'pytest + Hypothesis', additional: 'FastAPI', build: 'pip' })
  })
  it('reads C#, xUnit + FluentAssertions and ASP.NET Core from a .csproj', () => {
    const root = aProject({ 'Shop.Tests/Shop.Tests.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>'
      + '<PackageReference Include="xunit" /><PackageReference Include="FluentAssertions" /></ItemGroup></Project>' })

    assert.deepEqual(detect(root), { language: 'C#', testing: 'xUnit + FluentAssertions', additional: 'ASP.NET Core', build: 'dotnet' })
  })
  it('detects nothing in an empty project', () => {
    assert.deepEqual(detect(aProject({})), { language: null, testing: null, additional: null, build: null })
  })
})

describe('tdd.js start with the chosen stack', () => {
  it('creates the config for the chosen language, records the stack, and shows it in the test list', () => {
    const root = aProject({})

    const result = tdd(root, ['start', 'luhn', '--mode', 'inside-out',
      '--language', 'Java', '--test-stack', 'JUnit 5 + AssertJ', '--stack', 'Spring Boot'])

    assert.equal(result.code, OK, result.out)
    const config = readJson(root, '.tdd/config.json')
    assert.deepEqual(config.stack, { language: 'Java', testing: 'JUnit 5 + AssertJ', additional: 'Spring Boot' })
    assert.match(config.testCommand, /^mvn /)
    assert.deepEqual(config.sourceFilePatterns, ['src/main/**'])
    assert.match(fs.readFileSync(path.join(root, '.tdd/test-list.md'), 'utf8'), /Stack: Java · JUnit 5 \+ AssertJ · Spring Boot/)
  })
  it('deduces the stack from the existing code when none is given: no question to ask', () => {
    const root = aProject({ 'pom.xml': SPRING_POM })

    const result = tdd(root, ['start', 'luhn', '--mode', 'inside-out'])

    assert.equal(result.code, OK, result.out)
    assert.deepEqual(readJson(root, '.tdd/config.json').stack, { language: 'Java', testing: 'JUnit 5 + AssertJ', additional: 'Spring Boot' })
    assert.match(fs.readFileSync(path.join(root, '.tdd/test-list.md'), 'utf8'), /Stack: Java · JUnit 5 \+ AssertJ · Spring Boot/)
  })
  it('records no stack when there is no code and no answer: the command asks the human first', () => {
    const root = aProject({})

    tdd(root, ['start', 'luhn'])

    assert.equal(readJson(root, '.tdd/config.json').stack, undefined)
  })
  it('runs the chosen test runner: Vitest for TypeScript', () => {
    const root = aProject({})

    tdd(root, ['start', 'fees', '--language', 'TypeScript', '--test-stack', 'Vitest'])

    assert.match(readJson(root, '.tdd/config.json').testCommand, /vitest run/)
  })
  it('uses Gradle for Java when the project has a build.gradle', () => {
    const root = aProject({ 'build.gradle.kts': 'plugins { java }' })

    tdd(root, ['start', 'fees', '--language', 'Java', '--test-stack', 'JUnit 5'])

    assert.match(readJson(root, '.tdd/config.json').testCommand, /gradle/)
  })
  it('updates only the stack of an existing config', () => {
    const root = aTddProject({ phase: 'OFF', config: { testCommand: 'make test' } })

    tdd(root, ['start', 'fees', '--language', 'Kotlin', '--test-stack', 'Kotest', '--stack', 'Ktor'])

    const config = readJson(root, '.tdd/config.json')
    assert.equal(config.testCommand, 'make test')
    assert.deepEqual(config.stack, { language: 'Kotlin', testing: 'Kotest', additional: 'Ktor' })
  })
  it('gives the stack in the session context', () => {
    const root = aTddProject({ phase: 'RED', config: { stack: { language: 'Java', testing: 'JUnit 5 + AssertJ', additional: 'Spring Boot' } } })

    const result = runHook('session-start.js', { hook_event_name: 'SessionStart', source: 'startup', cwd: root })

    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /Stack: Java · JUnit 5 \+ AssertJ · Spring Boot/)
  })
})
