/**
 * @module TestingBlueprint
 * @description Complete blueprint definition for Testing frameworks.
 * Covers test runners, assertion libraries, mocking systems, fixture management,
 * coverage reporting, snapshot testing, property-based testing, and CI integration.
 * Designed for building standalone testing tools or comprehensive test infrastructure.
 *
 * @author ClawOS Framework
 * @license MIT
 */

/**
 * @typedef {import('../blueprint-engine.js').Blueprint} Blueprint
 */

/**
 * Full Testing framework blueprint.
 * @type {Blueprint}
 */
const testingBlueprint = {
  name: 'testing-framework',
  description: 'Comprehensive testing framework with test runner, assertion library, mocking system, fixture management, coverage analysis, snapshot testing, property-based testing, and rich reporters',
  archetype: 'library',
  domain: 'testing',

  structure: {
    directories: [
      'src',
      'src/runner',
      'src/runner/lifecycle',
      'src/assertions',
      'src/assertions/matchers',
      'src/mocks',
      'src/fixtures',
      'src/coverage',
      'src/snapshots',
      'src/property',
      'src/reporters',
      'src/reporters/built-in',
      'src/discovery',
      'src/cli',
      'src/watch',
      'src/parallel',
      'src/core',
      'src/core/errors',
      'src/core/logger',
      'src/core/config',
      'src/core/events',
      'src/utils',
      'config',
      'docs',
      'docs/api',
      'docs/guides',
      'tests',
      'tests/self',
      'tests/self/runner',
      'tests/self/assertions',
      'tests/self/mocks',
      'tests/self/fixtures',
      'tests/integration',
      'tests/fixtures',
      'examples',
      'examples/basic',
      'examples/advanced',
      'bin',
      'scripts',
      '.claude',
      '.claude/commands',
      '.github',
      '.github/workflows',
    ],

    files: [
      // ── Root ──
      { path: 'package.json', description: 'Package manifest with bin entry for test CLI', template: 'package-json-testing' },
      { path: 'README.md', description: 'Testing framework guide — installation, API reference, examples', template: 'readme' },
      { path: '.gitignore', description: 'Git ignore rules', template: 'gitignore' },

      // ── Bin ──
      { path: 'bin/test.js', description: 'CLI entry point (#!/usr/bin/env node)', template: 'test-bin' },

      // ── Entry ──
      { path: 'src/index.js', description: 'Public API — exports describe, it, expect, mock, etc.', template: 'testing-entry' },

      // ── Runner ──
      { path: 'src/runner/index.js', description: 'Runner barrel export', template: 'barrel' },
      { path: 'src/runner/test-runner.js', description: 'Core test runner — discovers, loads, and executes test suites', template: 'test-runner' },
      { path: 'src/runner/suite.js', description: 'Test suite container — describe() blocks with nesting', template: 'suite' },
      { path: 'src/runner/test-case.js', description: 'Individual test case — it() / test() blocks', template: 'test-case' },
      { path: 'src/runner/test-result.js', description: 'Test result data structure (pass, fail, skip, todo)', template: 'test-result' },
      { path: 'src/runner/lifecycle/hooks.js', description: 'Lifecycle hooks — beforeAll, afterAll, beforeEach, afterEach', template: 'lifecycle-hooks' },
      { path: 'src/runner/lifecycle/timeout.js', description: 'Test timeout management and async deadline enforcement', template: 'timeout' },
      { path: 'src/runner/lifecycle/retry.js', description: 'Flaky test retry logic with configurable attempts', template: 'test-retry' },

      // ── Assertions ──
      { path: 'src/assertions/index.js', description: 'Assertions barrel export', template: 'barrel' },
      { path: 'src/assertions/expect.js', description: 'expect() entry point — returns chainable assertion', template: 'expect' },
      { path: 'src/assertions/assertion.js', description: 'Core assertion engine with .not, .deep, .to, .be chains', template: 'assertion' },
      { path: 'src/assertions/matchers/equality.js', description: 'Equality matchers (toBe, toEqual, toStrictEqual, toDeepEqual)', template: 'matcher-equality' },
      { path: 'src/assertions/matchers/truthiness.js', description: 'Truthiness matchers (toBeTruthy, toBeFalsy, toBeNull, toBeDefined)', template: 'matcher-truthiness' },
      { path: 'src/assertions/matchers/numeric.js', description: 'Numeric matchers (toBeGreaterThan, toBeLessThan, toBeCloseTo)', template: 'matcher-numeric' },
      { path: 'src/assertions/matchers/string.js', description: 'String matchers (toContain, toMatch, toStartWith, toEndWith)', template: 'matcher-string' },
      { path: 'src/assertions/matchers/collection.js', description: 'Array/Set matchers (toContain, toHaveLength, toInclude)', template: 'matcher-collection' },
      { path: 'src/assertions/matchers/error.js', description: 'Error matchers (toThrow, toThrowError, toReject)', template: 'matcher-error' },
      { path: 'src/assertions/matchers/type.js', description: 'Type matchers (toBeInstanceOf, toBeTypeOf, toBeArray)', template: 'matcher-type' },
      { path: 'src/assertions/matchers/custom.js', description: 'Custom matcher registration API', template: 'matcher-custom' },
      { path: 'src/assertions/diff.js', description: 'Deep diff engine for assertion failure messages', template: 'diff' },

      // ── Mocks ──
      { path: 'src/mocks/index.js', description: 'Mocks barrel export', template: 'barrel' },
      { path: 'src/mocks/mock.js', description: 'Mock object creator with method tracking', template: 'mock' },
      { path: 'src/mocks/spy.js', description: 'Function spy — records calls, args, return values', template: 'spy' },
      { path: 'src/mocks/stub.js', description: 'Stub — returns configured values, throws, or resolves', template: 'stub' },
      { path: 'src/mocks/fake-timers.js', description: 'Fake timers — control setTimeout, setInterval, Date.now', template: 'fake-timers' },
      { path: 'src/mocks/mock-module.js', description: 'Module mocking — replace imports/requires with fakes', template: 'mock-module' },

      // ── Fixtures ──
      { path: 'src/fixtures/index.js', description: 'Fixtures barrel export', template: 'barrel' },
      { path: 'src/fixtures/loader.js', description: 'Fixture file loader (JSON, YAML, text)', template: 'fixture-loader' },
      { path: 'src/fixtures/factory.js', description: 'Fixture factory builder — define, extend, create, createMany', template: 'fixture-factory' },
      { path: 'src/fixtures/context.js', description: 'Fixture context — per-test isolated fixture state', template: 'fixture-context' },

      // ── Coverage ──
      { path: 'src/coverage/index.js', description: 'Coverage barrel export', template: 'barrel' },
      { path: 'src/coverage/collector.js', description: 'Coverage data collector — instruments and tracks execution', template: 'coverage-collector' },
      { path: 'src/coverage/reporter.js', description: 'Coverage report generator (text, lcov, html, json)', template: 'coverage-reporter' },
      { path: 'src/coverage/thresholds.js', description: 'Coverage threshold enforcement (line, branch, function, statement)', template: 'coverage-thresholds' },

      // ── Snapshots ──
      { path: 'src/snapshots/index.js', description: 'Snapshots barrel export', template: 'barrel' },
      { path: 'src/snapshots/snapshot-manager.js', description: 'Snapshot creation, comparison, and update workflow', template: 'snapshot-manager' },
      { path: 'src/snapshots/serializers.js', description: 'Snapshot serializers (JSON, string, custom)', template: 'snapshot-serializers' },

      // ── Property-based testing ──
      { path: 'src/property/index.js', description: 'Property testing barrel export', template: 'barrel' },
      { path: 'src/property/arbitrary.js', description: 'Value generators — int, string, array, object, oneOf', template: 'arbitrary' },
      { path: 'src/property/property.js', description: 'Property check runner — forAll, shrink on failure', template: 'property' },
      { path: 'src/property/shrink.js', description: 'Value shrinker — finds minimal failing case', template: 'shrink' },

      // ── Reporters ──
      { path: 'src/reporters/index.js', description: 'Reporters barrel export', template: 'barrel' },
      { path: 'src/reporters/reporter-interface.js', description: 'Reporter interface — onSuiteStart, onTestPass, onTestFail, onComplete', template: 'reporter-interface' },
      { path: 'src/reporters/built-in/spec.js', description: 'Spec reporter — hierarchical pass/fail output', template: 'reporter-spec' },
      { path: 'src/reporters/built-in/dot.js', description: 'Dot reporter — minimal dots output', template: 'reporter-dot' },
      { path: 'src/reporters/built-in/json.js', description: 'JSON reporter — machine-readable output', template: 'reporter-json' },
      { path: 'src/reporters/built-in/tap.js', description: 'TAP reporter — Test Anything Protocol output', template: 'reporter-tap' },
      { path: 'src/reporters/built-in/summary.js', description: 'Summary reporter — totals and timing', template: 'reporter-summary' },

      // ── Discovery ──
      { path: 'src/discovery/index.js', description: 'Discovery barrel export', template: 'barrel' },
      { path: 'src/discovery/file-finder.js', description: 'Test file discovery by glob patterns and conventions', template: 'file-finder' },
      { path: 'src/discovery/filter.js', description: 'Test filtering by name, tag, grep pattern, or file', template: 'test-filter' },

      // ── CLI ──
      { path: 'src/cli/index.js', description: 'CLI barrel export', template: 'barrel' },
      { path: 'src/cli/cli-parser.js', description: 'Test runner CLI argument parser', template: 'test-cli-parser' },
      { path: 'src/cli/config-resolver.js', description: 'Config file resolution (testconfig.json, package.json)', template: 'test-config-resolver' },

      // ── Watch mode ──
      { path: 'src/watch/index.js', description: 'Watch barrel export', template: 'barrel' },
      { path: 'src/watch/watcher.js', description: 'File watcher — re-runs affected tests on change', template: 'watcher' },
      { path: 'src/watch/dependency-graph.js', description: 'Module dependency graph for targeted re-runs', template: 'dep-graph' },

      // ── Parallel execution ──
      { path: 'src/parallel/index.js', description: 'Parallel barrel export', template: 'barrel' },
      { path: 'src/parallel/worker-pool.js', description: 'Worker thread pool for parallel test execution', template: 'worker-pool' },
      { path: 'src/parallel/partitioner.js', description: 'Test partitioning strategy (round-robin, by file, by timing)', template: 'partitioner' },

      // ── Core infrastructure ──
      { path: 'src/core/errors/test-error.js', description: 'Test-specific errors (AssertionError, TimeoutError, SetupError)', template: 'test-error' },
      { path: 'src/core/errors/index.js', description: 'Errors barrel export', template: 'barrel' },
      { path: 'src/core/logger/logger.js', description: 'Internal logger for framework diagnostics', template: 'logger' },
      { path: 'src/core/logger/index.js', description: 'Logger barrel export', template: 'barrel' },
      { path: 'src/core/config/defaults.js', description: 'Default test runner configuration', template: 'test-config-defaults' },
      { path: 'src/core/config/schema.js', description: 'Config validation schema', template: 'config-schema' },
      { path: 'src/core/config/index.js', description: 'Config barrel export', template: 'barrel' },
      { path: 'src/core/events/event-bus.js', description: 'Event bus for test lifecycle events', template: 'event-bus' },
      { path: 'src/core/events/index.js', description: 'Events barrel export', template: 'barrel' },

      // ── Utils ──
      { path: 'src/utils/deep-equal.js', description: 'Deep structural equality comparison', template: 'deep-equal' },
      { path: 'src/utils/pretty-print.js', description: 'Pretty-print values for assertion messages', template: 'pretty-print' },
      { path: 'src/utils/timer.js', description: 'High-resolution timer for test duration tracking', template: 'timer' },
      { path: 'src/utils/glob.js', description: 'Minimal glob pattern matcher', template: 'glob' },
      { path: 'src/utils/index.js', description: 'Utils barrel export', template: 'barrel' },

      // ── Config ──
      { path: 'config/default.json', description: 'Default test runner configuration file', template: 'config-default' },

      // ── Self-tests (testing the testing framework) ──
      { path: 'tests/self/runner/test-runner.test.js', description: 'Self-test: test runner execution', template: 'test-unit' },
      { path: 'tests/self/assertions/expect.test.js', description: 'Self-test: expect() and matchers', template: 'test-unit' },
      { path: 'tests/self/mocks/spy.test.js', description: 'Self-test: spy functionality', template: 'test-unit' },
      { path: 'tests/self/fixtures/factory.test.js', description: 'Self-test: fixture factory', template: 'test-unit' },
      { path: 'tests/integration/full-run.test.js', description: 'Integration: full test suite run', template: 'test-integration' },
      { path: 'tests/fixtures/sample-suite.js', description: 'Sample test suite fixture for self-tests', template: 'fixture-suite' },

      // ── Examples ──
      { path: 'examples/basic/first-test.js', description: 'Example: basic test with describe/it/expect', template: 'example-basic' },
      { path: 'examples/basic/async-test.js', description: 'Example: async/await test with timeouts', template: 'example-async' },
      { path: 'examples/advanced/mocking.js', description: 'Example: mocks, spies, and stubs', template: 'example-mocking' },
      { path: 'examples/advanced/property-test.js', description: 'Example: property-based testing', template: 'example-property' },
      { path: 'examples/advanced/snapshot.js', description: 'Example: snapshot testing', template: 'example-snapshot' },

      // ── Claude Code ──
      { path: 'CLAUDE.md', description: 'Claude Code context — testing API, assertion patterns, contribution guide', template: 'claude-md' },
      { path: '.claude/settings.json', description: 'Claude Code settings', template: 'claude-settings' },
      { path: '.claude/commands/review.md', description: '/review — review test quality and coverage', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: '/test — run self-tests', template: 'claude-cmd-test' },
      { path: '.claude/commands/add-matcher.md', description: '/add-matcher — scaffold a new assertion matcher', template: 'claude-cmd-add-matcher' },

      // ── CI ──
      { path: '.github/workflows/ci.yml', description: 'CI pipeline (self-tests, coverage thresholds)', template: 'github-actions-ci' },

      // ── Scripts ──
      { path: 'scripts/benchmark.js', description: 'Performance benchmark script for the test runner', template: 'benchmark' },
    ],
  },

  modules: [
    {
      name: 'runner',
      path: 'src/runner',
      responsibility: 'Test discovery, loading, execution, lifecycle hooks, retry, and result collection',
      dependencies: ['discovery', 'core/events', 'core/errors', 'reporters'],
      exports: ['TestRunner', 'Suite', 'TestCase', 'TestResult', 'hooks'],
    },
    {
      name: 'assertions',
      path: 'src/assertions',
      responsibility: 'expect() API, chainable matchers, deep diff, custom matcher registration',
      dependencies: ['core/errors', 'utils'],
      exports: ['expect', 'Assertion', 'matchers', 'diff'],
    },
    {
      name: 'mocks',
      path: 'src/mocks',
      responsibility: 'Mock objects, spies, stubs, fake timers, and module mocking',
      dependencies: ['core/errors'],
      exports: ['mock', 'spy', 'stub', 'fakeTimers', 'mockModule'],
    },
    {
      name: 'fixtures',
      path: 'src/fixtures',
      responsibility: 'Fixture loading, factory pattern for test data, per-test isolation',
      dependencies: ['core/config'],
      exports: ['FixtureLoader', 'FixtureFactory', 'FixtureContext'],
    },
    {
      name: 'coverage',
      path: 'src/coverage',
      responsibility: 'Code coverage collection, threshold enforcement, multi-format reporting',
      dependencies: ['core/config', 'core/logger'],
      exports: ['CoverageCollector', 'CoverageReporter', 'Thresholds'],
    },
    {
      name: 'snapshots',
      path: 'src/snapshots',
      responsibility: 'Snapshot creation, comparison, update workflow, custom serializers',
      dependencies: ['utils', 'core/errors'],
      exports: ['SnapshotManager', 'serializers'],
    },
    {
      name: 'property',
      path: 'src/property',
      responsibility: 'Property-based testing — value generators, forAll, shrinking',
      dependencies: ['runner', 'assertions'],
      exports: ['arbitrary', 'property', 'shrink'],
    },
    {
      name: 'reporters',
      path: 'src/reporters',
      responsibility: 'Test output formatting — spec, dot, JSON, TAP, summary reporters',
      dependencies: ['core/events'],
      exports: ['ReporterInterface', 'SpecReporter', 'DotReporter', 'JsonReporter', 'TapReporter', 'SummaryReporter'],
    },
    {
      name: 'discovery',
      path: 'src/discovery',
      responsibility: 'Test file discovery by glob patterns and filtering by name/tag/grep',
      dependencies: ['core/config', 'utils'],
      exports: ['FileFinder', 'TestFilter'],
    },
    {
      name: 'cli',
      path: 'src/cli',
      responsibility: 'CLI argument parsing and configuration resolution for the test runner',
      dependencies: ['runner', 'core/config'],
      exports: ['CliParser', 'ConfigResolver'],
    },
    {
      name: 'watch',
      path: 'src/watch',
      responsibility: 'File watching and targeted re-runs based on module dependency graph',
      dependencies: ['runner', 'discovery'],
      exports: ['Watcher', 'DependencyGraph'],
    },
    {
      name: 'parallel',
      path: 'src/parallel',
      responsibility: 'Worker thread pool and test partitioning for parallel execution',
      dependencies: ['runner', 'discovery'],
      exports: ['WorkerPool', 'Partitioner'],
    },
    {
      name: 'core/errors',
      path: 'src/core/errors',
      responsibility: 'Test error types (AssertionError, TimeoutError, SetupError)',
      dependencies: [],
      exports: ['TestError', 'AssertionError', 'TimeoutError', 'SetupError'],
    },
    {
      name: 'core/logger',
      path: 'src/core/logger',
      responsibility: 'Internal framework logging',
      dependencies: ['core/config'],
      exports: ['Logger'],
    },
    {
      name: 'core/config',
      path: 'src/core/config',
      responsibility: 'Test runner configuration defaults and schema validation',
      dependencies: [],
      exports: ['defaults', 'configSchema'],
    },
    {
      name: 'core/events',
      path: 'src/core/events',
      responsibility: 'Event bus for test lifecycle (suiteStart, testPass, testFail, complete)',
      dependencies: [],
      exports: ['EventBus'],
    },
    {
      name: 'utils',
      path: 'src/utils',
      responsibility: 'Deep equality, pretty printing, high-res timer, glob matching',
      dependencies: [],
      exports: ['deepEqual', 'prettyPrint', 'Timer', 'glob'],
    },
  ],

  config: {
    files: [
      'config/default.json',
    ],
    format: 'json',
  },

  integrations: [
    'claude-code',
    'github-actions',
    'coverage-tools',
  ],

  metadata: {
    estimatedFiles: 82,
    complexity: 'medium',
    layers: ['runner', 'assertions', 'mocks', 'fixtures', 'coverage', 'reporters', 'config'],
  },
};

/**
 * Recommended blueprint fragments from the registry for a testing project.
 * @type {string[]}
 */
const recommendedFragments = [
  'error-handling',
  'logging',
  'config-system',
  'event-bus',
  'factory-pattern',
  'cli-parser',
  'test-runner',
  'mock-system',
  'fixture-loader',
  'github-actions',
  'claude-md',
  'claude-settings',
  'claude-commands',
];

/**
 * Patterns recommended for testing frameworks.
 * @type {{name: string, description: string, reason: string}[]}
 */
const recommendedPatterns = [
  { name: 'Fluent Interface', description: 'Chainable assertion API (expect(x).to.be.greaterThan(5))', reason: 'Readable, expressive test assertions' },
  { name: 'Observer Pattern', description: 'Event-based reporter system', reason: 'Decouple test execution from output formatting' },
  { name: 'Factory Pattern', description: 'Fixture factories for test data creation', reason: 'Consistent, customizable test data across suites' },
  { name: 'Template Method', description: 'Suite lifecycle hooks (before/after each/all)', reason: 'Consistent setup/teardown patterns' },
  { name: 'Strategy Pattern', description: 'Pluggable reporters (spec, dot, json, tap)', reason: 'Support multiple output formats for different CI/human needs' },
  { name: 'Proxy Pattern', description: 'Spy/mock via Proxy objects for transparent interception', reason: 'Non-invasive test doubles without modifying production code' },
];

export { testingBlueprint, recommendedFragments, recommendedPatterns };
export default testingBlueprint;
