'use strict'
// The project's stack: detected from its build files to pre-select the answers of /tdd:start,
// then chosen by the human (language, test stack, additional stack) and kept in config.stack.
const fs = require('node:fs')
const path = require('node:path')

const read = (root, name) => { try { return fs.readFileSync(path.join(root, name), 'utf8') } catch { return null } }

// [what to look for in the build file, the name to show], first match wins for runners and frameworks.
const JVM = {
  runners: [[/junit-jupiter|junit-bom/, 'JUnit 5'], [/kotest/, 'Kotest'], [/<artifactId>junit<\/artifactId>|junit:junit/, 'JUnit 4']],
  extras: [[/assertj/, 'AssertJ'], [/jqwik/, 'jqwik'], [/junit-quickcheck/, 'junit-quickcheck']],
  frameworks: [[/spring-boot/, 'Spring Boot'], [/quarkus/, 'Quarkus'], [/micronaut/, 'Micronaut'], [/ktor/, 'Ktor']],
}
const NODE = {
  runners: [[/^vitest$/, 'Vitest'], [/^jest$/, 'Jest'], [/^mocha$/, 'Mocha']],
  extras: [[/^fast-check$/, 'fast-check']],
  frameworks: [[/^@nestjs\/core$/, 'NestJS'], [/^express$/, 'Express'], [/^fastify$/, 'Fastify'], [/^next$/, 'Next.js'],
    [/^react$/, 'React'], [/^@angular\/core$/, 'Angular'], [/^vue$/, 'Vue']],
}
const PYTHON = {
  runners: [[/\bpytest\b/i, 'pytest']],
  extras: [[/\bhypothesis\b/i, 'Hypothesis']],
  frameworks: [[/\bdjango\b/i, 'Django'], [/\bfastapi\b/i, 'FastAPI'], [/\bflask\b/i, 'Flask']],
}
const DOTNET = {
  runners: [[/"xunit/i, 'xUnit'], [/"nunit/i, 'NUnit'], [/"mstest/i, 'MSTest']],
  extras: [[/"FluentAssertions"/, 'FluentAssertions'], [/"NFluent"/, 'NFluent'], [/"FsCheck/, 'FsCheck']],
  frameworks: [[/Sdk\.Web|Microsoft\.AspNetCore/, 'ASP.NET Core']],
}

const first = (pairs, matches) => (pairs.find(([pattern]) => matches(pattern)) || [])[1] || null
function describeWith(rules, matches) {
  const runner = first(rules.runners, matches)
  const extras = rules.extras.filter(([pattern]) => matches(pattern)).map(([, name]) => name)
  return { testing: [runner, ...extras].filter(Boolean).join(' + ') || null, additional: first(rules.frameworks, matches) }
}

function projectFiles(root, extensions, depth = 2) {
  const found = []
  const walk = (dir, level) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) found.push(full)
      if (entry.isDirectory() && level > 0 && !entry.name.startsWith('.') && !['node_modules', 'bin', 'obj', 'target'].includes(entry.name)) walk(full, level - 1)
    }
  }
  walk(root, depth)
  return found
}

function detectStack(root) {
  const pkg = read(root, 'package.json')
  if (pkg) {
    let json = {}
    try { json = JSON.parse(pkg) } catch { /* unreadable package.json: language only */ }
    const deps = Object.keys({ ...json.dependencies, ...json.devDependencies })
    const matches = (pattern) => deps.some((dep) => pattern.test(dep))
    const language = read(root, 'tsconfig.json') !== null || deps.includes('typescript') ? 'TypeScript' : 'JavaScript'
    return { language, ...describeWith(NODE, matches), build: 'npm' }
  }
  const pom = read(root, 'pom.xml')
  const gradle = read(root, 'build.gradle.kts') || read(root, 'build.gradle')
  if (pom || gradle) {
    const text = pom || gradle
    const language = /kotlin/i.test(text) ? 'Kotlin' : 'Java'
    return { language, ...describeWith(JVM, (pattern) => pattern.test(text)), build: pom ? 'maven' : 'gradle' }
  }
  const python = [read(root, 'pyproject.toml'), read(root, 'requirements.txt'), read(root, 'requirements-dev.txt')].filter(Boolean).join('\n')
  if (python) return { language: 'Python', ...describeWith(PYTHON, (pattern) => pattern.test(python)), build: 'pip' }
  const projects = projectFiles(root, ['.csproj', '.fsproj'])
  if (projects.length > 0) {
    const text = projects.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
    const language = projects.some((file) => file.endsWith('.fsproj')) ? 'F#' : 'C#'
    return { language, ...describeWith(DOTNET, (pattern) => pattern.test(text)), build: 'dotnet' }
  }
  return { language: null, testing: null, additional: null, build: null }
}

const VITEST = {
  testCommand: 'npx vitest run --exclude "test/acceptance/**"',
  acceptanceCommand: 'npx vitest run test/acceptance',
}

// The config preset for the chosen language and test stack, or null to fall back on detection.
function presetNameFor({ language }, root) {
  switch ((language || '').toLowerCase()) {
    case 'java': case 'kotlin':
      return read(root, 'build.gradle.kts') !== null || read(root, 'build.gradle') !== null ? 'gradle' : 'maven'
    case 'typescript': case 'javascript': return 'node'
    case 'python': return 'python'
    case 'c#': case 'f#': case 'csharp': return 'dotnet'
    default: return null
  }
}

function testStackOverrides({ testing }) {
  return /vitest/i.test(testing || '') ? VITEST : {}
}

const stackLine = (stack) => {
  const parts = stack ? [stack.language, stack.testing, stack.additional].filter(Boolean) : []
  return parts.length > 0 ? `Stack: ${parts.join(' · ')}` : ''
}

module.exports = { detectStack, presetNameFor, testStackOverrides, stackLine }
