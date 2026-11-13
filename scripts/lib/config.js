'use strict'
const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_CONFIG = Object.freeze({
  defaultMode: 'outside-in',
  testCommand: 'npm test --silent',
  acceptanceCommand: 'npm test --silent -- test/acceptance',
  testFilePatterns: ['**/*.test.*', '**/*.spec.*', 'test/**', 'tests/**'],
  acceptanceTestPatterns: ['test/acceptance/**'],
  fakePatterns: ['test/fakes/**'],
  testSupportPatterns: ['test/builders/**', 'test/assertions/**'],
  assertionMethodPatterns: ['\\bexpect\\('],
  sourceFilePatterns: ['src/**'],
  freeFilePatterns: ['*.md', '.tdd/test-list.md', 'docs/**'],
  mockPolicy: { 'inside-out': 'allow', 'outside-in': 'justify' },
  mockPatterns: [
    'jest\\.(?:fn|mock|spyOn)\\(', // Jest
    'vi\\.(?:fn|mock|spyOn)\\(', // Vitest
    'sinon\\.(?:mock|stub|spy)\\(', // Sinon
    '\\bmock\\.(?:fn|method)\\(', // node:test
    '\\bMockito\\.(?:mock|verify|when)\\(|@Mock\\b|\\bverify\\(', // Mockito
    '\\b(?:Magic)?Mock\\(|\\bpatch(?:\\.object)?\\(|\\.assert_called\\w*\\(', // unittest.mock
    '\\bnew Mock<', // Moq
    '\\bSubstitute\\.For<', // NSubstitute
  ],
  mutationCommand: '',
  reviewBetweenItems: true,
  commitOnGreen: false,
  commitOnRefactor: true,
  strict: true,
})

function configPath(root) {
  return path.join(root, '.tdd', 'config.json')
}

function loadConfig(root) {
  const file = configPath(root)
  const own = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  return {
    ...DEFAULT_CONFIG,
    ...own,
    mockPolicy: { ...DEFAULT_CONFIG.mockPolicy, ...(own.mockPolicy || {}) },
  }
}

const PRESETS = {
  node: {
    testCommand: 'npm test --silent -- --testPathIgnorePatterns acceptance',
    acceptanceCommand: 'npm test --silent -- test/acceptance',
    testFilePatterns: ['**/*.test.*', '**/*.spec.*', 'test/**'],
    mutationCommand: 'npx stryker run --mutate {files}',
  },
  maven: {
    testCommand: 'mvn -q test -Dtest="!*AcceptanceTest"',
    acceptanceCommand: 'mvn -q test -Dtest="*AcceptanceTest"',
    testFilePatterns: ['src/test/**'],
    acceptanceTestPatterns: ['src/test/**/acceptance/**', '**/*AcceptanceTest.java'],
    fakePatterns: ['src/test/**/fakes/**'],
    testSupportPatterns: ['src/test/**/builders/**', 'src/test/**/assertions/**'],
    sourceFilePatterns: ['src/main/**'],
    mutationCommand: 'mvn -q org.pitest:pitest-maven:mutationCoverage',
  },
  gradle: {
    testCommand: './gradlew -q test',
    acceptanceCommand: './gradlew -q acceptanceTest',
    testFilePatterns: ['src/test/**'],
    acceptanceTestPatterns: ['src/test/**/acceptance/**', '**/*AcceptanceTest.*'],
    fakePatterns: ['src/test/**/fakes/**'],
    testSupportPatterns: ['src/test/**/builders/**', 'src/test/**/assertions/**'],
    sourceFilePatterns: ['src/main/**'],
    mutationCommand: './gradlew pitest',
  },
  python: {
    testCommand: 'python -m pytest -q --ignore=tests/acceptance',
    acceptanceCommand: 'python -m pytest -q tests/acceptance',
    testFilePatterns: ['tests/**', '**/test_*.py', '**/*_test.py'],
    acceptanceTestPatterns: ['tests/acceptance/**'],
    fakePatterns: ['tests/fakes/**'],
    testSupportPatterns: ['tests/builders/**', 'tests/assertions/**'],
    mutationCommand: 'mutmut run --paths-to-mutate {files}',
  },
  dotnet: {
    testCommand: 'dotnet test --filter "Category!=Acceptance"',
    acceptanceCommand: 'dotnet test --filter "Category=Acceptance"',
    testFilePatterns: ['**/*.Tests/**', '**/*Tests.cs', '**/*Test.cs'],
    acceptanceTestPatterns: ['**/Acceptance/**'],
    fakePatterns: ['**/Doubles/**'],
    testSupportPatterns: ['**/Builders/**', '**/Assertions/**'],
    mutationCommand: 'dotnet stryker --mutate {files}',
  },
}

function hasCsproj(dir, depth = 2) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.csproj')) return true
    if (entry.isDirectory() && depth > 0 && !entry.name.startsWith('.') && entry.name !== 'node_modules'
      && hasCsproj(path.join(dir, entry.name), depth - 1)) return true
  }
  return false
}

function detectEcosystem(root) {
  const has = (name) => fs.existsSync(path.join(root, name))
  if (has('package.json')) return 'node'
  if (has('pom.xml')) return 'maven'
  if (has('pyproject.toml')) return 'python'
  if (hasCsproj(root)) return 'dotnet'
  return null
}

// Proposal only: /tdd:start shows it to the human before writing it.
function detectConfig(root) {
  const ecosystem = detectEcosystem(root)
  if (!ecosystem) return null
  return { ecosystem, config: { ...DEFAULT_CONFIG, ...PRESETS[ecosystem] } }
}

module.exports = { DEFAULT_CONFIG, PRESETS, loadConfig, configPath, detectConfig }
