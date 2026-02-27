/**
 * @module domains/testing-framework
 * @description Domain knowledge for Testing framework generation.
 */

const TESTING_FRAMEWORK_DOMAIN = {
  id: 'testing',
  name: 'Testing Framework',
  description: 'Frameworks for unit testing, integration testing, E2E testing, and test automation',

  coreConcepts: [
    'test-runner',
    'assertion-library',
    'test-lifecycle',
    'describe-it-blocks',
    'mocking-stubbing',
    'fixtures',
    'reporters',
    'coverage',
    'parallel-execution',
    'snapshot-testing',
    'watch-mode',
    'test-filtering',
  ],

  architecturalStyles: {
    unit: {
      name: 'Unit Test Framework',
      description: 'Fast, isolated tests for individual functions/classes (e.g., Jest, Vitest)',
      patterns: ['test-suite', 'assertion-chain', 'mock-factory', 'snapshot'],
    },
    integration: {
      name: 'Integration Test Framework',
      description: 'Tests for component interactions and API contracts',
      patterns: ['test-server', 'database-seeder', 'fixture-loader', 'cleanup-hook'],
    },
    e2e: {
      name: 'E2E Test Framework',
      description: 'Browser/system-level testing (e.g., Playwright, Cypress)',
      patterns: ['page-object', 'browser-driver', 'screenshot-capture', 'network-intercept'],
    },
    property: {
      name: 'Property-Based Testing',
      description: 'Generative testing with random inputs (e.g., fast-check)',
      patterns: ['arbitrary-generator', 'shrinking', 'property-assertion'],
    },
  },

  directoryStructure: {
    src: {
      runner: 'Test runner — discovers, loads, and executes tests',
      assertions: 'Assertion library — expect/assert functions',
      mocks: 'Mocking system — spies, stubs, fakes',
      reporters: 'Output reporters — console, JSON, JUnit, HTML',
      fixtures: 'Fixture management — setup/teardown',
      matchers: 'Custom matchers — toBe, toEqual, toContain, etc.',
      hooks: 'Lifecycle hooks — before, after, beforeEach, afterEach',
      utils: 'Utility functions',
      config: 'Test configuration',
      'index.js': 'Public API',
    },
    tests: {
      self: 'Self-tests (tests that test the test framework)',
    },
  },

  requiredModules: [
    {
      name: 'Test Runner',
      responsibility: 'Discover test files, execute them, collect results',
      interface: {
        methods: ['run(patterns)', 'addReporter(reporter)', 'setConfig(config)', 'getResults()', 'watch(patterns)'],
      },
    },
    {
      name: 'Assertion Library',
      responsibility: 'Provide expect/assert functions with rich matchers',
      interface: {
        methods: ['expect(value).toBe(expected)', 'expect(value).toEqual(expected)', 'expect(fn).toThrow()', 'expect(value).toBeTruthy()', 'expect(value).toContain(item)'],
      },
    },
    {
      name: 'Mock System',
      responsibility: 'Create spies, stubs, and mock objects',
      interface: {
        methods: ['spy(obj, method)', 'stub(obj, method, returnValue)', 'mock(module)', 'restore()', 'getCalls(spy)'],
      },
    },
    {
      name: 'Reporter',
      responsibility: 'Format and output test results',
      interface: {
        methods: ['onTestStart(test)', 'onTestPass(test)', 'onTestFail(test, error)', 'onSuiteComplete(results)', 'getSummary()'],
      },
    },
    {
      name: 'Test Suite',
      responsibility: 'Group tests with describe/it blocks and lifecycle hooks',
      interface: {
        methods: ['describe(name, fn)', 'it(name, fn)', 'before(fn)', 'after(fn)', 'beforeEach(fn)', 'afterEach(fn)'],
      },
    },
  ],

  optionalModules: [
    { name: 'Coverage Reporter', triggers: ['coverage', 'istanbul', 'c8', 'nyc'], provides: ['line coverage', 'branch coverage', 'HTML report'] },
    { name: 'Snapshot Testing', triggers: ['snapshot', 'inline-snapshot'], provides: ['snapshot creation', 'snapshot comparison', 'snapshot update'] },
    { name: 'Watch Mode', triggers: ['watch', 'hot-reload', 'file-watcher'], provides: ['file watching', 'selective re-run', 'fast feedback'] },
    { name: 'Parallel Runner', triggers: ['parallel', 'concurrent', 'worker', 'threads'], provides: ['worker threads', 'test sharding', 'load balancing'] },
    { name: 'Visual Regression', triggers: ['visual', 'screenshot', 'pixel', 'image'], provides: ['screenshot capture', 'pixel diff', 'visual report'] },
  ],

  referenceFrameworks: [
    { name: 'Jest', style: 'batteries-included', strength: 'complete solution' },
    { name: 'Vitest', style: 'modern-fast', strength: 'ESM native + fast' },
    { name: 'Mocha', style: 'flexible', strength: 'extensible + mature' },
    { name: 'Playwright', style: 'e2e-complete', strength: 'cross-browser + reliable' },
    { name: 'node:test', style: 'built-in', strength: 'zero deps' },
  ],

  codePatterns: {
    testSuite: `
const suites = [];
let currentSuite = null;

export function describe(name, fn) {
  const suite = { name, tests: [], before: [], after: [], beforeEach: [], afterEach: [], children: [] };
  const parent = currentSuite;
  if (parent) parent.children.push(suite);
  else suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = parent;
}

export function it(name, fn) {
  if (!currentSuite) throw new Error('it() must be called inside describe()');
  currentSuite.tests.push({ name, fn, status: 'pending' });
}

export function before(fn) { currentSuite?.before.push(fn); }
export function after(fn) { currentSuite?.after.push(fn); }
export function beforeEach(fn) { currentSuite?.beforeEach.push(fn); }
export function afterEach(fn) { currentSuite?.afterEach.push(fn); }`,
    assertion: `
export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new AssertionError(\`Expected \${actual} to be \${expected}\`);
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new AssertionError(\`Expected deep equality\`);
    },
    toBeTruthy() {
      if (!actual) throw new AssertionError(\`Expected \${actual} to be truthy\`);
    },
    toThrow(expected) {
      let threw = false;
      try { actual(); } catch (e) { threw = true; if (expected && !e.message.includes(expected)) throw new AssertionError(\`Wrong error\`); }
      if (!threw) throw new AssertionError('Expected function to throw');
    },
    toContain(item) {
      if (typeof actual === 'string' && !actual.includes(item)) throw new AssertionError(\`Expected string to contain \${item}\`);
      if (Array.isArray(actual) && !actual.includes(item)) throw new AssertionError(\`Expected array to contain \${item}\`);
    },
  };
}`,
  },

  testingStrategies: {
    unit: ['Test the test runner itself', 'Test assertion correctness', 'Test mock creation and tracking', 'Test reporter output'],
    integration: ['Test full test execution flow', 'Test lifecycle hook ordering', 'Test parallel execution'],
  },
};

export default TESTING_FRAMEWORK_DOMAIN;
