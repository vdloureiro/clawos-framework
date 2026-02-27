/**
 * @module BlueprintRegistry
 * @description Registry of reusable blueprint fragments for the ClawOS meta-framework.
 * Stores, indexes, and composes blueprint fragments across categories such as
 * core, middleware, plugin, testing, deployment, and Claude integration.
 *
 * Pre-loaded with 24 canonical fragments covering the most common patterns
 * in modern software projects.
 *
 * @author ClawOS Framework
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {'core'|'middleware'|'plugin'|'testing'|'deployment'|'claude-integration'} FragmentCategory
 */

/**
 * @typedef {Object} BlueprintFragment
 * @property {string}            id                   - Unique fragment identifier
 * @property {string}            name                 - Human-readable name
 * @property {FragmentCategory}  category             - Classification bucket
 * @property {string}            description          - What this fragment provides
 * @property {{path: string, description: string, template: string|null}[]} files - Files contributed
 * @property {string[]}          dependencies         - IDs of other fragments this depends on
 * @property {string[]}          compatibleArchetypes - Archetypes this works with ('*' = all)
 * @property {string[]}          [tags]               - Extra search keywords
 */

// ---------------------------------------------------------------------------
// Built-in fragments (24 entries)
// ---------------------------------------------------------------------------

/** @type {BlueprintFragment[]} */
const BUILTIN_FRAGMENTS = [
  // ---- core ----
  {
    id: 'error-handling',
    name: 'Error Handling',
    category: 'core',
    description: 'Structured error classes, error codes, and global error boundary',
    files: [
      { path: 'src/core/errors/index.js', description: 'Error class barrel export', template: 'barrel' },
      { path: 'src/core/errors/app-error.js', description: 'Base application error class', template: 'app-error' },
      { path: 'src/core/errors/error-codes.js', description: 'Enumerated error codes', template: 'error-codes' },
      { path: 'src/core/errors/error-handler.js', description: 'Global error handler / boundary', template: 'error-handler' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['error', 'exception', 'boundary', 'fault-tolerance'],
  },
  {
    id: 'logging',
    name: 'Logging System',
    category: 'core',
    description: 'Structured logger with levels, formatters, and transports',
    files: [
      { path: 'src/core/logger/index.js', description: 'Logger barrel export', template: 'barrel' },
      { path: 'src/core/logger/logger.js', description: 'Logger implementation with levels', template: 'logger' },
      { path: 'src/core/logger/formatters.js', description: 'Log output formatters (json, text, pretty)', template: 'log-formatters' },
      { path: 'src/core/logger/transports.js', description: 'Log transports (console, file, stream)', template: 'log-transports' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['log', 'debug', 'trace', 'observability'],
  },
  {
    id: 'config-system',
    name: 'Configuration System',
    category: 'core',
    description: 'Layered configuration loading from files, env vars, and defaults',
    files: [
      { path: 'src/core/config/index.js', description: 'Config barrel export', template: 'barrel' },
      { path: 'src/core/config/config-loader.js', description: 'Multi-source config loader', template: 'config-loader' },
      { path: 'src/core/config/schema.js', description: 'Config validation schema', template: 'config-schema' },
      { path: 'config/default.json', description: 'Default config values', template: 'config-default' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['configuration', 'env', 'settings', 'dotenv'],
  },
  {
    id: 'event-bus',
    name: 'Event Bus',
    category: 'core',
    description: 'In-process event emitter with typed events and wildcard support',
    files: [
      { path: 'src/core/events/index.js', description: 'Events barrel export', template: 'barrel' },
      { path: 'src/core/events/event-bus.js', description: 'Event bus with namespaced events', template: 'event-bus' },
      { path: 'src/core/events/event-types.js', description: 'Event type constants', template: 'event-types' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['event', 'pubsub', 'emitter', 'observer', 'message'],
  },
  {
    id: 'state-machine',
    name: 'State Machine',
    category: 'core',
    description: 'Finite state machine with transitions, guards, and hooks',
    files: [
      { path: 'src/core/state/index.js', description: 'State barrel export', template: 'barrel' },
      { path: 'src/core/state/state-machine.js', description: 'FSM implementation', template: 'state-machine' },
      { path: 'src/core/state/transitions.js', description: 'Transition definitions and guards', template: 'transitions' },
    ],
    dependencies: ['event-bus'],
    compatibleArchetypes: ['*'],
    tags: ['state', 'fsm', 'workflow', 'lifecycle'],
  },
  {
    id: 'dependency-injection',
    name: 'Dependency Injection Container',
    category: 'core',
    description: 'IoC container with constructor injection and lifecycle management',
    files: [
      { path: 'src/core/di/index.js', description: 'DI barrel export', template: 'barrel' },
      { path: 'src/core/di/container.js', description: 'IoC container implementation', template: 'di-container' },
      { path: 'src/core/di/decorators.js', description: 'Injection decorators / helpers', template: 'di-decorators' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['di', 'ioc', 'container', 'inject', 'inversion-of-control'],
  },
  {
    id: 'factory-pattern',
    name: 'Factory Pattern',
    category: 'core',
    description: 'Generic factory with registration, creation strategies, and caching',
    files: [
      { path: 'src/core/factory/index.js', description: 'Factory barrel export', template: 'barrel' },
      { path: 'src/core/factory/factory.js', description: 'Abstract factory implementation', template: 'factory' },
      { path: 'src/core/factory/registry.js', description: 'Creator registry', template: 'factory-registry' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['factory', 'builder', 'creator', 'pattern'],
  },

  // ---- middleware ----
  {
    id: 'middleware-pipeline',
    name: 'Middleware Pipeline',
    category: 'middleware',
    description: 'Composable middleware chain with next() semantics and error middleware',
    files: [
      { path: 'src/middleware/index.js', description: 'Middleware barrel export', template: 'barrel' },
      { path: 'src/middleware/pipeline.js', description: 'Middleware pipeline runner', template: 'middleware-pipeline' },
      { path: 'src/middleware/compose.js', description: 'Middleware composition utility', template: 'middleware-compose' },
    ],
    dependencies: ['error-handling'],
    compatibleArchetypes: ['api', 'fullstack', 'microservice', 'universal'],
    tags: ['middleware', 'pipeline', 'chain', 'compose'],
  },
  {
    id: 'rest-api',
    name: 'REST API Layer',
    category: 'middleware',
    description: 'REST router, controllers, request/response helpers, and validation',
    files: [
      { path: 'src/transport/router.js', description: 'HTTP route definitions', template: 'rest-router' },
      { path: 'src/transport/server.js', description: 'HTTP server bootstrap', template: 'http-server' },
      { path: 'src/controller/base-controller.js', description: 'Base controller class', template: 'base-controller' },
      { path: 'src/middleware/auth.js', description: 'Authentication middleware', template: 'auth-middleware' },
      { path: 'src/middleware/validation.js', description: 'Request validation middleware', template: 'validation-middleware' },
      { path: 'src/middleware/rate-limiter.js', description: 'Rate-limiting middleware', template: 'rate-limiter' },
    ],
    dependencies: ['middleware-pipeline', 'error-handling', 'logging'],
    compatibleArchetypes: ['api', 'fullstack', 'microservice'],
    tags: ['rest', 'http', 'route', 'controller', 'crud'],
  },
  {
    id: 'graphql-api',
    name: 'GraphQL API Layer',
    category: 'middleware',
    description: 'GraphQL schema, resolvers, data loaders, and type definitions',
    files: [
      { path: 'src/graphql/index.js', description: 'GraphQL barrel export', template: 'barrel' },
      { path: 'src/graphql/schema.js', description: 'Root schema composition', template: 'graphql-schema' },
      { path: 'src/graphql/resolvers/index.js', description: 'Resolver barrel', template: 'barrel' },
      { path: 'src/graphql/type-defs/index.js', description: 'Type definitions barrel', template: 'barrel' },
      { path: 'src/graphql/data-loaders.js', description: 'Batched data loaders', template: 'data-loaders' },
    ],
    dependencies: ['middleware-pipeline', 'error-handling'],
    compatibleArchetypes: ['api', 'fullstack'],
    tags: ['graphql', 'schema', 'resolver', 'query', 'mutation'],
  },
  {
    id: 'websocket',
    name: 'WebSocket Layer',
    category: 'middleware',
    description: 'WebSocket server, rooms, channels, and message protocol',
    files: [
      { path: 'src/transport/ws-server.js', description: 'WebSocket server setup', template: 'ws-server' },
      { path: 'src/transport/ws-handler.js', description: 'Message handler / dispatcher', template: 'ws-handler' },
      { path: 'src/transport/ws-protocol.js', description: 'Wire protocol definition', template: 'ws-protocol' },
    ],
    dependencies: ['event-bus', 'error-handling'],
    compatibleArchetypes: ['api', 'fullstack', 'ai-agent'],
    tags: ['websocket', 'ws', 'realtime', 'socket', 'channel'],
  },

  // ---- plugin ----
  {
    id: 'plugin-loader',
    name: 'Plugin Loader',
    category: 'plugin',
    description: 'Dynamic plugin discovery, loading, lifecycle hooks, and sandboxing',
    files: [
      { path: 'src/plugins/index.js', description: 'Plugin system barrel export', template: 'barrel' },
      { path: 'src/plugins/plugin-loader.js', description: 'Plugin discovery and loading', template: 'plugin-loader' },
      { path: 'src/plugins/plugin-manager.js', description: 'Plugin lifecycle manager', template: 'plugin-manager' },
      { path: 'src/plugins/plugin-interface.js', description: 'Plugin interface / contract', template: 'plugin-interface' },
    ],
    dependencies: ['event-bus', 'config-system'],
    compatibleArchetypes: ['*'],
    tags: ['plugin', 'extension', 'addon', 'hook', 'lifecycle'],
  },
  {
    id: 'cli-parser',
    name: 'CLI Parser',
    category: 'plugin',
    description: 'Argument parser, command router, help generator, and completions',
    files: [
      { path: 'src/parser/index.js', description: 'Parser barrel export', template: 'barrel' },
      { path: 'src/parser/arg-parser.js', description: 'Argument tokenizer and parser', template: 'arg-parser' },
      { path: 'src/parser/command-registry.js', description: 'Command registration and lookup', template: 'command-registry' },
      { path: 'src/parser/help-generator.js', description: 'Auto-generated help text', template: 'help-generator' },
      { path: 'src/parser/completions.js', description: 'Shell completion scripts', template: 'completions' },
    ],
    dependencies: ['error-handling', 'config-system'],
    compatibleArchetypes: ['cli', 'universal'],
    tags: ['cli', 'argv', 'command', 'parse', 'flag', 'option'],
  },
  {
    id: 'slash-commands',
    name: 'Slash Commands',
    category: 'plugin',
    description: 'Slash-command system for Claude Code or chat-style interfaces',
    files: [
      { path: 'src/commands/index.js', description: 'Commands barrel export', template: 'barrel' },
      { path: 'src/commands/command-handler.js', description: 'Slash command dispatcher', template: 'command-handler' },
      { path: 'src/commands/built-in/help.js', description: '/help command', template: 'cmd-help' },
      { path: 'src/commands/built-in/status.js', description: '/status command', template: 'cmd-status' },
      { path: '.claude/commands/review.md', description: 'Claude slash command: review', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: 'Claude slash command: test', template: 'claude-cmd-test' },
    ],
    dependencies: ['cli-parser'],
    compatibleArchetypes: ['cli', 'ai-agent', 'universal'],
    tags: ['slash', 'command', 'chat', 'interactive'],
  },

  // ---- testing ----
  {
    id: 'test-runner',
    name: 'Test Runner',
    category: 'testing',
    description: 'Minimal test runner with assertions, suites, hooks, and reporters',
    files: [
      { path: 'src/testing/index.js', description: 'Testing barrel export', template: 'barrel' },
      { path: 'src/testing/runner.js', description: 'Test suite runner', template: 'test-runner' },
      { path: 'src/testing/assertions.js', description: 'Assertion library', template: 'assertions' },
      { path: 'src/testing/reporters/console.js', description: 'Console reporter', template: 'reporter-console' },
      { path: 'src/testing/reporters/json.js', description: 'JSON reporter', template: 'reporter-json' },
      { path: 'tests/setup.js', description: 'Global test setup', template: 'test-setup' },
    ],
    dependencies: ['error-handling', 'logging'],
    compatibleArchetypes: ['*'],
    tags: ['test', 'spec', 'assert', 'suite', 'tdd', 'bdd'],
  },
  {
    id: 'mock-system',
    name: 'Mock & Stub System',
    category: 'testing',
    description: 'Test doubles: mocks, stubs, spies, and fakes',
    files: [
      { path: 'src/testing/mocks/index.js', description: 'Mocks barrel export', template: 'barrel' },
      { path: 'src/testing/mocks/mock.js', description: 'Mock object creator', template: 'mock' },
      { path: 'src/testing/mocks/spy.js', description: 'Function spy', template: 'spy' },
      { path: 'src/testing/mocks/stub.js', description: 'Stub / fake implementation', template: 'stub' },
    ],
    dependencies: ['test-runner'],
    compatibleArchetypes: ['*'],
    tags: ['mock', 'stub', 'spy', 'fake', 'double', 'test'],
  },
  {
    id: 'fixture-loader',
    name: 'Fixture Loader',
    category: 'testing',
    description: 'Test fixture loading from JSON/YAML files with factory support',
    files: [
      { path: 'src/testing/fixtures/index.js', description: 'Fixtures barrel export', template: 'barrel' },
      { path: 'src/testing/fixtures/loader.js', description: 'Fixture file loader', template: 'fixture-loader' },
      { path: 'src/testing/fixtures/factory.js', description: 'Fixture factory builder', template: 'fixture-factory' },
      { path: 'tests/fixtures/.gitkeep', description: 'Fixture directory placeholder', template: null },
    ],
    dependencies: ['test-runner'],
    compatibleArchetypes: ['*'],
    tags: ['fixture', 'factory', 'seed', 'data', 'test'],
  },

  // ---- deployment ----
  {
    id: 'docker-setup',
    name: 'Docker Setup',
    category: 'deployment',
    description: 'Dockerfile, docker-compose, and .dockerignore for containerised builds',
    files: [
      { path: 'Dockerfile', description: 'Multi-stage Docker build', template: 'dockerfile' },
      { path: 'docker-compose.yml', description: 'Docker Compose services', template: 'docker-compose' },
      { path: '.dockerignore', description: 'Docker ignore rules', template: 'dockerignore' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['docker', 'container', 'compose', 'devops'],
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions CI/CD',
    category: 'deployment',
    description: 'GitHub Actions workflows for CI, testing, linting, and release',
    files: [
      { path: '.github/workflows/ci.yml', description: 'Continuous integration pipeline', template: 'github-actions-ci' },
      { path: '.github/workflows/release.yml', description: 'Release automation', template: 'github-actions-release' },
      { path: '.github/PULL_REQUEST_TEMPLATE.md', description: 'PR template', template: 'pr-template' },
      { path: '.github/ISSUE_TEMPLATE/bug.md', description: 'Bug report template', template: 'issue-bug' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['ci', 'cd', 'github', 'actions', 'pipeline', 'deploy'],
  },
  {
    id: 'release-management',
    name: 'Release Management',
    category: 'deployment',
    description: 'Semantic versioning, changelog generation, and release scripts',
    files: [
      { path: 'scripts/release.js', description: 'Release automation script', template: 'release-script' },
      { path: 'CHANGELOG.md', description: 'Project changelog', template: 'changelog' },
      { path: '.versionrc.json', description: 'Version bump configuration', template: 'versionrc' },
    ],
    dependencies: ['github-actions'],
    compatibleArchetypes: ['*'],
    tags: ['release', 'semver', 'version', 'changelog', 'tag'],
  },

  // ---- claude-integration ----
  {
    id: 'claude-md',
    name: 'CLAUDE.md Project Context',
    category: 'claude-integration',
    description: 'CLAUDE.md file with project context, conventions, and instructions for Claude Code',
    files: [
      { path: 'CLAUDE.md', description: 'Claude Code project context and conventions', template: 'claude-md' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['claude', 'context', 'ai', 'documentation'],
  },
  {
    id: 'claude-settings',
    name: 'Claude Code Settings',
    category: 'claude-integration',
    description: 'Claude Code settings with allowed/denied tools and permissions',
    files: [
      { path: '.claude/settings.json', description: 'Claude Code tool permissions', template: 'claude-settings' },
      { path: '.claude/settings.local.json', description: 'Local Claude Code overrides', template: 'claude-settings-local' },
    ],
    dependencies: [],
    compatibleArchetypes: ['*'],
    tags: ['claude', 'settings', 'permissions', 'config'],
  },
  {
    id: 'claude-commands',
    name: 'Claude Slash Commands',
    category: 'claude-integration',
    description: 'Custom slash commands for Claude Code workflows',
    files: [
      { path: '.claude/commands/review.md', description: '/review - code review workflow', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: '/test - run and analyze tests', template: 'claude-cmd-test' },
      { path: '.claude/commands/refactor.md', description: '/refactor - refactoring workflow', template: 'claude-cmd-refactor' },
      { path: '.claude/commands/deploy.md', description: '/deploy - deployment workflow', template: 'claude-cmd-deploy' },
    ],
    dependencies: ['claude-md'],
    compatibleArchetypes: ['*'],
    tags: ['claude', 'slash', 'command', 'workflow', 'automation'],
  },
  {
    id: 'claude-hooks',
    name: 'Claude Code Hooks',
    category: 'claude-integration',
    description: 'Event hooks for Claude Code lifecycle (pre-commit, post-edit, etc.)',
    files: [
      { path: '.claude/hooks/pre-commit.js', description: 'Pre-commit validation hook', template: 'hook-pre-commit' },
      { path: '.claude/hooks/post-edit.js', description: 'Post-edit formatting hook', template: 'hook-post-edit' },
      { path: '.claude/hooks/on-error.js', description: 'Error recovery hook', template: 'hook-on-error' },
    ],
    dependencies: ['claude-settings'],
    compatibleArchetypes: ['*'],
    tags: ['claude', 'hook', 'lifecycle', 'event', 'automation'],
  },
];

// ---------------------------------------------------------------------------
// BlueprintRegistry class
// ---------------------------------------------------------------------------

class BlueprintRegistry {
  /** @type {Map<string, BlueprintFragment>} */
  #fragments = new Map();

  /** @type {Map<string, Set<string>>} */
  #categoryIndex = new Map();

  /**
   * Create a new BlueprintRegistry, optionally pre-loaded with built-in fragments.
   * @param {Object} [options]
   * @param {boolean} [options.loadBuiltins=true] - Whether to load the 24 built-in fragments.
   */
  constructor(options = {}) {
    const { loadBuiltins = true } = options;
    if (loadBuiltins) {
      for (const fragment of BUILTIN_FRAGMENTS) {
        this.register(fragment);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Mutation
  // -----------------------------------------------------------------------

  /**
   * Register a new blueprint fragment.
   * @param {BlueprintFragment} fragment
   * @throws {Error} If fragment.id is missing.
   */
  register(fragment) {
    if (!fragment || !fragment.id) {
      throw new Error('BlueprintRegistry.register: fragment.id is required');
    }

    this.#fragments.set(fragment.id, Object.freeze({ ...fragment }));

    if (!this.#categoryIndex.has(fragment.category)) {
      this.#categoryIndex.set(fragment.category, new Set());
    }
    this.#categoryIndex.get(fragment.category).add(fragment.id);
  }

  /**
   * Remove a fragment by id.
   * @param {string} id
   * @returns {boolean} Whether the fragment existed.
   */
  unregister(id) {
    const frag = this.#fragments.get(id);
    if (!frag) return false;
    this.#fragments.delete(id);
    const catSet = this.#categoryIndex.get(frag.category);
    if (catSet) catSet.delete(id);
    return true;
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /**
   * Retrieve a fragment by its unique id.
   * @param {string} id
   * @returns {BlueprintFragment|undefined}
   */
  getById(id) {
    return this.#fragments.get(id);
  }

  /**
   * Retrieve all fragments in a given category.
   * @param {FragmentCategory} category
   * @returns {BlueprintFragment[]}
   */
  getByCategory(category) {
    const ids = this.#categoryIndex.get(category);
    if (!ids) return [];
    return [...ids].map((id) => this.#fragments.get(id)).filter(Boolean);
  }

  /**
   * Retrieve all fragments compatible with a given archetype.
   * @param {string} archetype
   * @returns {BlueprintFragment[]}
   */
  getCompatible(archetype) {
    /** @type {BlueprintFragment[]} */
    const results = [];
    for (const frag of this.#fragments.values()) {
      if (
        frag.compatibleArchetypes.includes('*') ||
        frag.compatibleArchetypes.includes(archetype)
      ) {
        results.push(frag);
      }
    }
    return results;
  }

  /**
   * Free-text search across fragment names, descriptions, and tags.
   * Returns fragments ranked by relevance (number of keyword hits).
   * @param {string} query
   * @returns {BlueprintFragment[]}
   */
  search(query) {
    const terms = query
      .toLowerCase()
      .split(/[\s,;|]+/)
      .filter(Boolean);

    if (terms.length === 0) return this.getAll();

    /** @type {{fragment: BlueprintFragment, score: number}[]} */
    const scored = [];

    for (const frag of this.#fragments.values()) {
      const haystack = [
        frag.id,
        frag.name,
        frag.description,
        frag.category,
        ...(frag.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score += 1;
      }
      if (score > 0) scored.push({ fragment: frag, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.fragment);
  }

  /**
   * Return all registered fragments.
   * @returns {BlueprintFragment[]}
   */
  getAll() {
    return [...this.#fragments.values()];
  }

  /**
   * Return all available category names.
   * @returns {FragmentCategory[]}
   */
  getCategories() {
    return /** @type {FragmentCategory[]} */ ([...this.#categoryIndex.keys()]);
  }

  /**
   * Return the total number of registered fragments.
   * @returns {number}
   */
  get size() {
    return this.#fragments.size;
  }

  // -----------------------------------------------------------------------
  // Composition
  // -----------------------------------------------------------------------

  /**
   * Compose multiple fragments into a single merged overlay object that can
   * be passed to `BlueprintEngine.addOverlay()`.
   *
   * Resolves transitive dependencies automatically (a fragment's deps are
   * pulled in if not already in the list). Files are deduplicated by path.
   *
   * @param {string[]} fragmentIds - IDs of fragments to compose.
   * @returns {{files: {path: string, description: string, template: string|null}[], dependencies: string[], ids: string[]}}
   * @throws {Error} If any fragment id is not found.
   */
  compose(fragmentIds) {
    const resolved = this.#resolveDependencies(fragmentIds);

    /** @type {Map<string, {path: string, description: string, template: string|null}>} */
    const fileMap = new Map();

    for (const id of resolved) {
      const frag = this.#fragments.get(id);
      if (!frag) {
        throw new Error(`BlueprintRegistry.compose: unknown fragment "${id}"`);
      }
      for (const file of frag.files) {
        if (!fileMap.has(file.path)) {
          fileMap.set(file.path, { ...file });
        }
      }
    }

    return {
      files: [...fileMap.values()],
      dependencies: resolved.filter((id) => !fragmentIds.includes(id)),
      ids: resolved,
    };
  }

  /**
   * Validate that a set of fragment ids can be composed together (no missing
   * deps, no incompatible archetypes).
   *
   * @param {string[]} fragmentIds
   * @param {string}   [archetype] - If provided, checks archetype compatibility.
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate(fragmentIds, archetype) {
    /** @type {string[]} */
    const errors = [];

    for (const id of fragmentIds) {
      const frag = this.#fragments.get(id);
      if (!frag) {
        errors.push(`Fragment "${id}" not found in registry`);
        continue;
      }

      // Check archetype compatibility
      if (
        archetype &&
        !frag.compatibleArchetypes.includes('*') &&
        !frag.compatibleArchetypes.includes(archetype)
      ) {
        errors.push(
          `Fragment "${id}" is not compatible with archetype "${archetype}" ` +
          `(compatible: ${frag.compatibleArchetypes.join(', ')})`,
        );
      }

      // Check dependencies exist
      for (const dep of frag.dependencies) {
        if (!this.#fragments.has(dep)) {
          errors.push(`Fragment "${id}" depends on "${dep}" which is not in the registry`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve the full dependency tree for a set of fragment ids (topological).
   * @param {string[]} ids
   * @returns {string[]} Ordered list (dependencies first).
   */
  #resolveDependencies(ids) {
    /** @type {Set<string>} */
    const visited = new Set();
    /** @type {string[]} */
    const ordered = [];

    /**
     * @param {string} id
     * @param {Set<string>} stack - cycle detection
     */
    const visit = (id, stack = new Set()) => {
      if (visited.has(id)) return;
      if (stack.has(id)) {
        throw new Error(`Circular dependency detected: ${[...stack, id].join(' -> ')}`);
      }

      const frag = this.#fragments.get(id);
      if (!frag) {
        throw new Error(`BlueprintRegistry: unknown fragment "${id}"`);
      }

      stack.add(id);
      for (const dep of frag.dependencies) {
        visit(dep, new Set(stack));
      }
      visited.add(id);
      ordered.push(id);
    };

    for (const id of ids) {
      visit(id);
    }

    return ordered;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BlueprintRegistry, BUILTIN_FRAGMENTS };
export default BlueprintRegistry;
