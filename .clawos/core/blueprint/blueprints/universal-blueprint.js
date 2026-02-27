/**
 * @module UniversalBlueprint
 * @description Complete blueprint definition for Universal / Hybrid frameworks.
 * Designed as the "meta-blueprint" — an adaptable scaffold that can serve as
 * the foundation for any type of framework. Includes a core layer, adapter system,
 * plugin architecture, configuration management, and comprehensive hooks for
 * customization. When the target domain is unknown or the project spans multiple
 * concerns, this blueprint provides the most flexible starting point.
 *
 * @author ClawOS Framework
 * @license MIT
 */

/**
 * @typedef {import('../blueprint-engine.js').Blueprint} Blueprint
 */

/**
 * Full Universal framework blueprint.
 * @type {Blueprint}
 */
const universalBlueprint = {
  name: 'universal-framework',
  description: 'Adaptable meta-framework scaffold with core layer, adapter system, plugin architecture, middleware pipeline, configuration management, and comprehensive extension hooks — suitable for any project type',
  archetype: 'universal',
  domain: 'multi',

  structure: {
    directories: [
      'src',
      'src/core',
      'src/core/errors',
      'src/core/logger',
      'src/core/config',
      'src/core/events',
      'src/core/state',
      'src/core/di',
      'src/core/factory',
      'src/adapters',
      'src/adapters/built-in',
      'src/plugins',
      'src/plugins/built-in',
      'src/middleware',
      'src/hooks',
      'src/hooks/built-in',
      'src/schemas',
      'src/generators',
      'src/generators/templates',
      'src/cli',
      'src/cli/commands',
      'src/api',
      'src/utils',
      'config',
      'config/presets',
      'docs',
      'docs/architecture',
      'docs/guides',
      'docs/api',
      'tests',
      'tests/unit',
      'tests/unit/core',
      'tests/unit/adapters',
      'tests/unit/plugins',
      'tests/unit/middleware',
      'tests/unit/generators',
      'tests/integration',
      'tests/fixtures',
      'examples',
      'examples/api-project',
      'examples/cli-project',
      'examples/agent-project',
      'scripts',
      'bin',
      '.claude',
      '.claude/commands',
      '.github',
      '.github/workflows',
      '.github/ISSUE_TEMPLATE',
    ],

    files: [
      // ── Root ──
      { path: 'package.json', description: 'Package manifest with bin, exports, and workspace config', template: 'package-json-universal' },
      { path: 'README.md', description: 'Universal framework guide — philosophy, architecture, getting started', template: 'readme' },
      { path: '.gitignore', description: 'Git ignore rules', template: 'gitignore' },
      { path: '.env.example', description: 'Environment variable template', template: 'env-example' },
      { path: 'LICENSE', description: 'Project license', template: 'license' },

      // ── Bin ──
      { path: 'bin/cli.js', description: 'CLI entry point for framework commands (init, generate, build, etc.)', template: 'cli-bin' },

      // ── Entry ──
      { path: 'src/index.js', description: 'Public API — re-exports core, adapters, plugins, middleware, generators', template: 'universal-entry' },

      // ── Core ──
      { path: 'src/core/index.js', description: 'Core barrel export', template: 'barrel' },
      { path: 'src/core/kernel.js', description: 'Application kernel — boot sequence, module loading, shutdown hooks', template: 'kernel' },
      { path: 'src/core/lifecycle.js', description: 'Application lifecycle manager (init, start, stop, restart)', template: 'lifecycle' },
      { path: 'src/core/module-loader.js', description: 'Dynamic module loader with dependency resolution', template: 'module-loader' },
      { path: 'src/core/registry.js', description: 'Generic service / component registry', template: 'registry' },

      // ── Core / Errors ──
      { path: 'src/core/errors/index.js', description: 'Errors barrel export', template: 'barrel' },
      { path: 'src/core/errors/app-error.js', description: 'Base application error with code, status, and context', template: 'app-error' },
      { path: 'src/core/errors/error-codes.js', description: 'Canonical error code map', template: 'error-codes' },
      { path: 'src/core/errors/error-handler.js', description: 'Global error boundary with recovery strategies', template: 'error-handler' },

      // ── Core / Logger ──
      { path: 'src/core/logger/index.js', description: 'Logger barrel export', template: 'barrel' },
      { path: 'src/core/logger/logger.js', description: 'Structured logger with levels, formatters, and transports', template: 'logger' },
      { path: 'src/core/logger/formatters.js', description: 'Log output formatters (json, text, pretty)', template: 'log-formatters' },
      { path: 'src/core/logger/transports.js', description: 'Log transports (console, file, stream)', template: 'log-transports' },

      // ── Core / Config ──
      { path: 'src/core/config/index.js', description: 'Config barrel export', template: 'barrel' },
      { path: 'src/core/config/config-loader.js', description: 'Multi-source config loader (files, env, defaults, CLI flags)', template: 'config-loader' },
      { path: 'src/core/config/schema.js', description: 'Config validation schema (type-checks, required fields, defaults)', template: 'config-schema' },
      { path: 'src/core/config/presets.js', description: 'Named config presets (minimal, standard, full, production)', template: 'config-presets' },

      // ── Core / Events ──
      { path: 'src/core/events/index.js', description: 'Events barrel export', template: 'barrel' },
      { path: 'src/core/events/event-bus.js', description: 'Async event bus with namespaces, wildcards, and priorities', template: 'event-bus' },
      { path: 'src/core/events/event-types.js', description: 'Core event type constants (boot, ready, shutdown, error)', template: 'event-types' },

      // ── Core / State ──
      { path: 'src/core/state/index.js', description: 'State barrel export', template: 'barrel' },
      { path: 'src/core/state/state-machine.js', description: 'Finite state machine with guards, actions, and observers', template: 'state-machine' },
      { path: 'src/core/state/transitions.js', description: 'Default application state transitions', template: 'transitions' },

      // ── Core / DI ──
      { path: 'src/core/di/index.js', description: 'DI barrel export', template: 'barrel' },
      { path: 'src/core/di/container.js', description: 'IoC container — singleton, transient, and scoped lifetimes', template: 'di-container' },
      { path: 'src/core/di/decorators.js', description: 'Injection helpers (inject, injectable, scope)', template: 'di-decorators' },

      // ── Core / Factory ──
      { path: 'src/core/factory/index.js', description: 'Factory barrel export', template: 'barrel' },
      { path: 'src/core/factory/factory.js', description: 'Abstract factory with caching and strategy selection', template: 'factory' },
      { path: 'src/core/factory/registry.js', description: 'Creator registry for factory pattern', template: 'factory-registry' },

      // ── Adapters ──
      { path: 'src/adapters/index.js', description: 'Adapters barrel export', template: 'barrel' },
      { path: 'src/adapters/adapter-interface.js', description: 'Adapter interface contract — init, connect, disconnect, execute', template: 'adapter-interface' },
      { path: 'src/adapters/adapter-manager.js', description: 'Adapter lifecycle management — load, activate, deactivate', template: 'adapter-manager' },
      { path: 'src/adapters/built-in/http-adapter.js', description: 'HTTP server adapter (for API mode)', template: 'http-adapter' },
      { path: 'src/adapters/built-in/cli-adapter.js', description: 'CLI adapter (for command-line mode)', template: 'cli-adapter' },
      { path: 'src/adapters/built-in/worker-adapter.js', description: 'Background worker adapter (for job processing)', template: 'worker-adapter' },
      { path: 'src/adapters/built-in/stream-adapter.js', description: 'Stream/pipe adapter (for data pipeline mode)', template: 'stream-adapter' },

      // ── Plugins ──
      { path: 'src/plugins/index.js', description: 'Plugins barrel export', template: 'barrel' },
      { path: 'src/plugins/plugin-interface.js', description: 'Plugin interface — name, version, init, activate, deactivate', template: 'plugin-interface' },
      { path: 'src/plugins/plugin-loader.js', description: 'Plugin discovery from node_modules, local dirs, and config', template: 'plugin-loader' },
      { path: 'src/plugins/plugin-manager.js', description: 'Plugin lifecycle manager with dependency ordering', template: 'plugin-manager' },
      { path: 'src/plugins/plugin-sandbox.js', description: 'Plugin isolation sandbox (restricted API surface)', template: 'plugin-sandbox' },
      { path: 'src/plugins/built-in/logger-plugin.js', description: 'Built-in logging plugin', template: 'plugin-logger' },
      { path: 'src/plugins/built-in/metrics-plugin.js', description: 'Built-in metrics collection plugin', template: 'plugin-metrics' },
      { path: 'src/plugins/built-in/health-plugin.js', description: 'Built-in health check plugin', template: 'plugin-health' },

      // ── Middleware ──
      { path: 'src/middleware/index.js', description: 'Middleware barrel export', template: 'barrel' },
      { path: 'src/middleware/pipeline.js', description: 'Middleware pipeline — compose, execute, error path', template: 'middleware-pipeline' },
      { path: 'src/middleware/compose.js', description: 'Middleware composition function (koa-compose style)', template: 'middleware-compose' },
      { path: 'src/middleware/timing.js', description: 'Request / operation timing middleware', template: 'middleware-timing' },
      { path: 'src/middleware/validation.js', description: 'Input validation middleware', template: 'middleware-validation' },
      { path: 'src/middleware/caching.js', description: 'Response / result caching middleware', template: 'middleware-caching' },

      // ── Hooks ──
      { path: 'src/hooks/index.js', description: 'Hooks barrel export', template: 'barrel' },
      { path: 'src/hooks/hook-registry.js', description: 'Named hook point registry (tap, call, waterfall, bail)', template: 'hook-registry' },
      { path: 'src/hooks/hook-types.js', description: 'Hook type definitions (sync, async, waterfall, bail)', template: 'hook-types' },
      { path: 'src/hooks/built-in/before-start.js', description: 'beforeStart hook — runs before kernel boot', template: 'hook-before-start' },
      { path: 'src/hooks/built-in/after-stop.js', description: 'afterStop hook — cleanup after shutdown', template: 'hook-after-stop' },
      { path: 'src/hooks/built-in/on-error.js', description: 'onError hook — global error interception', template: 'hook-on-error' },

      // ── Schemas ──
      { path: 'src/schemas/index.js', description: 'Schemas barrel export', template: 'barrel' },
      { path: 'src/schemas/validator.js', description: 'JSON-schema-like validator (type, required, enum, pattern)', template: 'schema-validator' },
      { path: 'src/schemas/types.js', description: 'Built-in schema types (string, number, boolean, array, object)', template: 'schema-types' },

      // ── Generators ──
      { path: 'src/generators/index.js', description: 'Generators barrel export', template: 'barrel' },
      { path: 'src/generators/generator.js', description: 'File generator engine — reads template, interpolates, writes', template: 'generator' },
      { path: 'src/generators/scaffold.js', description: 'Project scaffolder — creates directories and files from blueprint', template: 'scaffold' },
      { path: 'src/generators/template-engine.js', description: 'Template interpolation engine ({{var}}, conditionals, loops)', template: 'template-engine' },
      { path: 'src/generators/templates/module.js.tpl', description: 'Module file template', template: null },
      { path: 'src/generators/templates/test.js.tpl', description: 'Test file template', template: null },
      { path: 'src/generators/templates/plugin.js.tpl', description: 'Plugin file template', template: null },
      { path: 'src/generators/templates/adapter.js.tpl', description: 'Adapter file template', template: null },

      // ── CLI ──
      { path: 'src/cli/index.js', description: 'CLI barrel export', template: 'barrel' },
      { path: 'src/cli/cli-app.js', description: 'CLI application — parses args, routes to commands', template: 'cli-app' },
      { path: 'src/cli/commands/init.js', description: 'init — create new project from blueprint', template: 'cmd-init' },
      { path: 'src/cli/commands/generate.js', description: 'generate — scaffold module, plugin, adapter, or test', template: 'cmd-generate' },
      { path: 'src/cli/commands/build.js', description: 'build — compile/bundle the project', template: 'cmd-build' },
      { path: 'src/cli/commands/dev.js', description: 'dev — start development mode with hot reload', template: 'cmd-dev' },
      { path: 'src/cli/commands/test.js', description: 'test — run the test suite', template: 'cmd-test' },
      { path: 'src/cli/commands/info.js', description: 'info — display project and framework metadata', template: 'cmd-info' },

      // ── API (programmatic) ──
      { path: 'src/api/index.js', description: 'Programmatic API barrel export', template: 'barrel' },
      { path: 'src/api/create-app.js', description: 'createApp() factory — programmatic application creation', template: 'create-app' },
      { path: 'src/api/define-module.js', description: 'defineModule() — declarative module definition helper', template: 'define-module' },
      { path: 'src/api/define-plugin.js', description: 'definePlugin() — declarative plugin definition helper', template: 'define-plugin' },

      // ── Utils ──
      { path: 'src/utils/index.js', description: 'Utils barrel export', template: 'barrel' },
      { path: 'src/utils/deep-merge.js', description: 'Deep object merging with array strategy options', template: 'deep-merge' },
      { path: 'src/utils/deep-clone.js', description: 'Deep clone without external dependencies', template: 'deep-clone' },
      { path: 'src/utils/slug.js', description: 'String to slug / kebab-case converter', template: 'slug' },
      { path: 'src/utils/debounce.js', description: 'Debounce and throttle utilities', template: 'debounce' },
      { path: 'src/utils/hash.js', description: 'Deterministic string hashing utility', template: 'hash' },
      { path: 'src/utils/env.js', description: 'Environment detection (node, browser, worker, test)', template: 'env' },

      // ── Config ──
      { path: 'config/default.json', description: 'Default framework configuration', template: 'config-default' },
      { path: 'config/presets/minimal.json', description: 'Minimal preset — core only, no plugins', template: 'config-preset-minimal' },
      { path: 'config/presets/standard.json', description: 'Standard preset — core + common plugins', template: 'config-preset-standard' },
      { path: 'config/presets/full.json', description: 'Full preset — all features enabled', template: 'config-preset-full' },

      // ── Tests ──
      { path: 'tests/setup.js', description: 'Test harness setup', template: 'test-setup' },
      { path: 'tests/unit/core/kernel.test.js', description: 'Kernel unit tests', template: 'test-unit' },
      { path: 'tests/unit/core/lifecycle.test.js', description: 'Lifecycle manager unit tests', template: 'test-unit' },
      { path: 'tests/unit/adapters/adapter-manager.test.js', description: 'Adapter manager unit tests', template: 'test-unit' },
      { path: 'tests/unit/plugins/plugin-manager.test.js', description: 'Plugin manager unit tests', template: 'test-unit' },
      { path: 'tests/unit/middleware/pipeline.test.js', description: 'Middleware pipeline unit tests', template: 'test-unit' },
      { path: 'tests/unit/generators/scaffold.test.js', description: 'Scaffolder unit tests', template: 'test-unit' },
      { path: 'tests/integration/boot.test.js', description: 'Full boot integration test', template: 'test-integration' },
      { path: 'tests/integration/plugin-lifecycle.test.js', description: 'Plugin lifecycle integration test', template: 'test-integration' },
      { path: 'tests/fixtures/sample-plugin.js', description: 'Sample plugin fixture', template: 'fixture-plugin' },
      { path: 'tests/fixtures/sample-adapter.js', description: 'Sample adapter fixture', template: 'fixture-adapter' },

      // ── Examples ──
      { path: 'examples/api-project/index.js', description: 'Example: using universal framework for an API', template: 'example-api' },
      { path: 'examples/cli-project/index.js', description: 'Example: using universal framework for a CLI', template: 'example-cli' },
      { path: 'examples/agent-project/index.js', description: 'Example: using universal framework for an AI agent', template: 'example-agent' },

      // ── Claude Code ──
      { path: 'CLAUDE.md', description: 'Claude Code context — framework philosophy, architecture, extension points, conventions', template: 'claude-md' },
      { path: '.claude/settings.json', description: 'Claude Code tool permissions', template: 'claude-settings' },
      { path: '.claude/commands/review.md', description: '/review — review code against framework conventions', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: '/test — run full test suite and report', template: 'claude-cmd-test' },
      { path: '.claude/commands/generate.md', description: '/generate — scaffold a new module, plugin, or adapter', template: 'claude-cmd-generate' },
      { path: '.claude/commands/architecture.md', description: '/architecture — explain and visualize the project architecture', template: 'claude-cmd-architecture' },

      // ── CI / Deployment ──
      { path: '.github/workflows/ci.yml', description: 'CI pipeline (lint, test, build, coverage)', template: 'github-actions-ci' },
      { path: '.github/workflows/release.yml', description: 'Release automation (semver, changelog, npm publish)', template: 'github-actions-release' },
      { path: '.github/PULL_REQUEST_TEMPLATE.md', description: 'Pull request template', template: 'pr-template' },
      { path: '.github/ISSUE_TEMPLATE/bug.md', description: 'Bug report template', template: 'issue-bug' },
      { path: '.github/ISSUE_TEMPLATE/feature.md', description: 'Feature request template', template: 'issue-feature' },
      { path: 'Dockerfile', description: 'Multi-stage Docker image', template: 'dockerfile' },
      { path: 'docker-compose.yml', description: 'Docker Compose for local development', template: 'docker-compose' },
      { path: '.dockerignore', description: 'Docker build context exclusions', template: 'dockerignore' },

      // ── Scripts ──
      { path: 'scripts/release.js', description: 'Release automation script', template: 'release-script' },
      { path: 'scripts/benchmark.js', description: 'Performance benchmark script', template: 'benchmark' },
    ],
  },

  modules: [
    {
      name: 'core',
      path: 'src/core',
      responsibility: 'Application kernel, lifecycle, module loading, service registry, errors, logging, config, events, state, DI, factory',
      dependencies: [],
      exports: ['Kernel', 'Lifecycle', 'ModuleLoader', 'Registry', 'AppError', 'Logger', 'ConfigLoader', 'EventBus', 'StateMachine', 'Container', 'Factory'],
    },
    {
      name: 'adapters',
      path: 'src/adapters',
      responsibility: 'Runtime adapters — swap between HTTP, CLI, worker, or stream mode via a uniform interface',
      dependencies: ['core'],
      exports: ['AdapterInterface', 'AdapterManager', 'HttpAdapter', 'CliAdapter', 'WorkerAdapter', 'StreamAdapter'],
    },
    {
      name: 'plugins',
      path: 'src/plugins',
      responsibility: 'Plugin discovery, loading, lifecycle management, sandboxing, and built-in plugins',
      dependencies: ['core'],
      exports: ['PluginInterface', 'PluginLoader', 'PluginManager', 'PluginSandbox'],
    },
    {
      name: 'middleware',
      path: 'src/middleware',
      responsibility: 'Composable middleware pipeline for request/operation processing',
      dependencies: ['core'],
      exports: ['Pipeline', 'compose', 'timingMiddleware', 'validationMiddleware', 'cachingMiddleware'],
    },
    {
      name: 'hooks',
      path: 'src/hooks',
      responsibility: 'Named hook points for framework and plugin extension (tap, call, waterfall, bail)',
      dependencies: ['core'],
      exports: ['HookRegistry', 'hookTypes'],
    },
    {
      name: 'schemas',
      path: 'src/schemas',
      responsibility: 'JSON-schema-like validation for configs, inputs, and plugin manifests',
      dependencies: ['core'],
      exports: ['Validator', 'schemaTypes'],
    },
    {
      name: 'generators',
      path: 'src/generators',
      responsibility: 'Code generation and project scaffolding from blueprints and templates',
      dependencies: ['core', 'schemas'],
      exports: ['Generator', 'Scaffold', 'TemplateEngine'],
    },
    {
      name: 'cli',
      path: 'src/cli',
      responsibility: 'Framework CLI — init, generate, build, dev, test, info commands',
      dependencies: ['core', 'generators'],
      exports: ['CliApp', 'commands'],
    },
    {
      name: 'api',
      path: 'src/api',
      responsibility: 'Programmatic API — createApp, defineModule, definePlugin helpers',
      dependencies: ['core', 'plugins', 'adapters'],
      exports: ['createApp', 'defineModule', 'definePlugin'],
    },
    {
      name: 'utils',
      path: 'src/utils',
      responsibility: 'Shared utilities — deep merge/clone, slugify, debounce, hash, env detection',
      dependencies: [],
      exports: ['deepMerge', 'deepClone', 'slug', 'debounce', 'hash', 'env'],
    },
  ],

  config: {
    files: [
      'config/default.json',
      'config/presets/minimal.json',
      'config/presets/standard.json',
      'config/presets/full.json',
      '.env.example',
    ],
    format: 'json',
  },

  integrations: [
    'claude-code',
    'docker',
    'github-actions',
    'npm-registry',
  ],

  metadata: {
    estimatedFiles: 105,
    complexity: 'medium',
    layers: ['core', 'adapters', 'plugins', 'middleware', 'hooks', 'generators', 'config'],
  },
};

/**
 * Recommended blueprint fragments from the registry for a universal project.
 * @type {string[]}
 */
const recommendedFragments = [
  'error-handling',
  'logging',
  'config-system',
  'event-bus',
  'state-machine',
  'dependency-injection',
  'factory-pattern',
  'middleware-pipeline',
  'plugin-loader',
  'cli-parser',
  'slash-commands',
  'test-runner',
  'mock-system',
  'fixture-loader',
  'docker-setup',
  'github-actions',
  'release-management',
  'claude-md',
  'claude-settings',
  'claude-commands',
  'claude-hooks',
];

/**
 * Patterns recommended for universal frameworks.
 * @type {{name: string, description: string, reason: string}[]}
 */
const recommendedPatterns = [
  { name: 'Kernel / Boot Sequence', description: 'Ordered module initialization with dependency resolution', reason: 'Predictable startup with clear failure points' },
  { name: 'Adapter Pattern', description: 'Runtime mode adapters (HTTP, CLI, worker, stream)', reason: 'Same core logic, multiple deployment targets' },
  { name: 'Plugin Architecture', description: 'Lifecycle-aware plugins with sandboxing', reason: 'Unlimited extensibility without core modifications' },
  { name: 'Hook System (Tapable-style)', description: 'Named hook points with sync/async/waterfall/bail semantics', reason: 'Fine-grained extension points for plugins and middleware' },
  { name: 'Middleware Pipeline', description: 'Composable request/operation processing chain', reason: 'Clean cross-cutting concern separation' },
  { name: 'Dependency Injection', description: 'IoC container with lifetime management', reason: 'Testable, swappable implementations' },
  { name: 'Factory + Registry', description: 'Dynamic creation with registered creators', reason: 'Extensible object creation without hard dependencies' },
  { name: 'Generator / Scaffold', description: 'Template-based code generation from blueprints', reason: 'Consistent project structure, rapid prototyping' },
];

export { universalBlueprint, recommendedFragments, recommendedPatterns };
export default universalBlueprint;
