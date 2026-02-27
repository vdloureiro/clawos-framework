/**
 * @module ApiBlueprint
 * @description Complete blueprint definition for API / HTTP server frameworks.
 * Covers RESTful services, GraphQL endpoints, WebSocket servers, and hybrid
 * API gateways. Includes transport, routing, middleware, controller, service,
 * and data layers plus all supporting infrastructure.
 *
 * @author ClawOS Framework
 * @license MIT
 */

/**
 * @typedef {import('../blueprint-engine.js').Blueprint} Blueprint
 */

/**
 * Full API framework blueprint.
 * @type {Blueprint}
 */
const apiBlueprint = {
  name: 'api-framework',
  description: 'Production-grade HTTP/WebSocket API server with layered architecture, middleware pipeline, authentication, validation, and comprehensive error handling',
  archetype: 'api',
  domain: 'web',

  structure: {
    directories: [
      'src',
      'src/transport',
      'src/routing',
      'src/middleware',
      'src/controllers',
      'src/services',
      'src/data',
      'src/data/models',
      'src/data/repositories',
      'src/data/migrations',
      'src/core',
      'src/core/errors',
      'src/core/logger',
      'src/core/config',
      'src/core/events',
      'src/core/di',
      'src/validation',
      'src/auth',
      'src/utils',
      'config',
      'config/environments',
      'docs',
      'docs/api',
      'tests',
      'tests/unit',
      'tests/unit/controllers',
      'tests/unit/services',
      'tests/unit/middleware',
      'tests/integration',
      'tests/integration/routes',
      'tests/fixtures',
      'scripts',
      '.claude',
      '.claude/commands',
      '.github',
      '.github/workflows',
    ],

    files: [
      // ── Root ──
      { path: 'package.json', description: 'Package manifest with scripts for dev, build, test, start', template: 'package-json' },
      { path: 'README.md', description: 'Project overview, setup, API docs link, and architecture diagram', template: 'readme' },
      { path: '.gitignore', description: 'Git ignore rules for node_modules, dist, .env, logs', template: 'gitignore' },
      { path: '.env.example', description: 'Environment variable template', template: 'env-example' },

      // ── Entry ──
      { path: 'src/index.js', description: 'Application bootstrap — initialises DI container, loads config, starts server', template: 'entry' },
      { path: 'src/app.js', description: 'Express/Fastify app factory — registers middleware and routes', template: 'app-factory' },

      // ── Transport ──
      { path: 'src/transport/http-server.js', description: 'HTTP server lifecycle (listen, graceful shutdown, keep-alive)', template: 'http-server' },
      { path: 'src/transport/ws-server.js', description: 'WebSocket server with room and channel support', template: 'ws-server' },
      { path: 'src/transport/index.js', description: 'Transport barrel export', template: 'barrel' },

      // ── Routing ──
      { path: 'src/routing/router.js', description: 'Central route registry — maps HTTP methods + paths to controllers', template: 'rest-router' },
      { path: 'src/routing/route-loader.js', description: 'Auto-discovers route files from convention-based directories', template: 'route-loader' },
      { path: 'src/routing/api-versioning.js', description: 'URL-prefix or header-based API versioning strategy', template: 'api-versioning' },
      { path: 'src/routing/index.js', description: 'Routing barrel export', template: 'barrel' },

      // ── Middleware ──
      { path: 'src/middleware/pipeline.js', description: 'Middleware pipeline runner (compose, next, error path)', template: 'middleware-pipeline' },
      { path: 'src/middleware/cors.js', description: 'CORS middleware with configurable origins', template: 'cors-middleware' },
      { path: 'src/middleware/auth.js', description: 'JWT / API-key authentication middleware', template: 'auth-middleware' },
      { path: 'src/middleware/validation.js', description: 'Request body & query param validation', template: 'validation-middleware' },
      { path: 'src/middleware/rate-limiter.js', description: 'Token-bucket / sliding-window rate limiter', template: 'rate-limiter' },
      { path: 'src/middleware/request-logger.js', description: 'HTTP request/response logging middleware', template: 'request-logger' },
      { path: 'src/middleware/error-handler.js', description: 'Global error-handling middleware (formats error responses)', template: 'error-handler-middleware' },
      { path: 'src/middleware/index.js', description: 'Middleware barrel export', template: 'barrel' },

      // ── Controllers ──
      { path: 'src/controllers/base-controller.js', description: 'Abstract controller with request parsing, response helpers, and error wrapping', template: 'base-controller' },
      { path: 'src/controllers/health-controller.js', description: 'Health-check and readiness probe endpoints', template: 'health-controller' },
      { path: 'src/controllers/index.js', description: 'Controllers barrel export', template: 'barrel' },

      // ── Services ──
      { path: 'src/services/base-service.js', description: 'Abstract service with logging, events, and transaction support', template: 'base-service' },
      { path: 'src/services/index.js', description: 'Services barrel export', template: 'barrel' },

      // ── Data layer ──
      { path: 'src/data/connection.js', description: 'Database connection pool / client factory', template: 'db-connection' },
      { path: 'src/data/models/base-model.js', description: 'Base model with CRUD and query builder', template: 'base-model' },
      { path: 'src/data/repositories/base-repository.js', description: 'Repository pattern — data access abstraction', template: 'base-repository' },
      { path: 'src/data/index.js', description: 'Data layer barrel export', template: 'barrel' },

      // ── Core infrastructure ──
      { path: 'src/core/errors/app-error.js', description: 'Typed application error with code and status', template: 'app-error' },
      { path: 'src/core/errors/error-codes.js', description: 'Canonical error code map', template: 'error-codes' },
      { path: 'src/core/errors/index.js', description: 'Errors barrel export', template: 'barrel' },
      { path: 'src/core/logger/logger.js', description: 'Structured logger (json + pretty modes)', template: 'logger' },
      { path: 'src/core/logger/index.js', description: 'Logger barrel export', template: 'barrel' },
      { path: 'src/core/config/config-loader.js', description: 'Config from files + env vars + defaults', template: 'config-loader' },
      { path: 'src/core/config/schema.js', description: 'Config validation schema', template: 'config-schema' },
      { path: 'src/core/config/index.js', description: 'Config barrel export', template: 'barrel' },
      { path: 'src/core/events/event-bus.js', description: 'In-process async event bus', template: 'event-bus' },
      { path: 'src/core/events/index.js', description: 'Events barrel export', template: 'barrel' },
      { path: 'src/core/di/container.js', description: 'Lightweight DI container', template: 'di-container' },
      { path: 'src/core/di/index.js', description: 'DI barrel export', template: 'barrel' },

      // ── Validation ──
      { path: 'src/validation/validator.js', description: 'Schema-based request validator', template: 'validator' },
      { path: 'src/validation/schemas/index.js', description: 'Validation schemas barrel', template: 'barrel' },

      // ── Auth ──
      { path: 'src/auth/strategies/jwt.js', description: 'JWT token strategy (sign, verify, refresh)', template: 'jwt-strategy' },
      { path: 'src/auth/strategies/api-key.js', description: 'API key lookup strategy', template: 'api-key-strategy' },
      { path: 'src/auth/index.js', description: 'Auth barrel export', template: 'barrel' },

      // ── Utils ──
      { path: 'src/utils/async-handler.js', description: 'Wraps async route handlers to catch unhandled rejections', template: 'async-handler' },
      { path: 'src/utils/response-builder.js', description: 'Standardised JSON response envelope builder', template: 'response-builder' },
      { path: 'src/utils/index.js', description: 'Utils barrel export', template: 'barrel' },

      // ── Config ──
      { path: 'config/default.json', description: 'Default configuration values', template: 'config-default' },
      { path: 'config/environments/development.json', description: 'Development-specific overrides', template: 'config-dev' },
      { path: 'config/environments/production.json', description: 'Production-specific overrides', template: 'config-prod' },
      { path: 'config/environments/test.json', description: 'Test-specific overrides', template: 'config-test' },

      // ── Tests ──
      { path: 'tests/setup.js', description: 'Test harness setup (env, mocks, helpers)', template: 'test-setup' },
      { path: 'tests/unit/controllers/health.test.js', description: 'Health controller unit tests', template: 'test-unit' },
      { path: 'tests/unit/middleware/auth.test.js', description: 'Auth middleware unit tests', template: 'test-unit' },
      { path: 'tests/unit/services/base-service.test.js', description: 'Base service unit tests', template: 'test-unit' },
      { path: 'tests/integration/routes/health.test.js', description: 'Health endpoint integration test', template: 'test-integration' },
      { path: 'tests/fixtures/users.json', description: 'Sample user fixtures', template: 'fixture-users' },

      // ── Scripts ──
      { path: 'scripts/migrate.js', description: 'Database migration runner', template: 'migrate-script' },
      { path: 'scripts/seed.js', description: 'Database seeding script', template: 'seed-script' },

      // ── Claude Code ──
      { path: 'CLAUDE.md', description: 'Claude Code project context — architecture, conventions, and key decisions', template: 'claude-md' },
      { path: '.claude/settings.json', description: 'Claude Code tool permissions and preferences', template: 'claude-settings' },
      { path: '.claude/commands/review.md', description: '/review — automated code review workflow', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: '/test — run and analyze test results', template: 'claude-cmd-test' },

      // ── CI / Deployment ──
      { path: 'Dockerfile', description: 'Multi-stage production Docker image', template: 'dockerfile' },
      { path: 'docker-compose.yml', description: 'Local dev services (app, db, redis)', template: 'docker-compose' },
      { path: '.dockerignore', description: 'Docker build context exclusions', template: 'dockerignore' },
      { path: '.github/workflows/ci.yml', description: 'CI pipeline (lint, test, build)', template: 'github-actions-ci' },
    ],
  },

  modules: [
    {
      name: 'transport',
      path: 'src/transport',
      responsibility: 'HTTP and WebSocket server lifecycle, TLS, graceful shutdown',
      dependencies: ['core/config', 'core/logger'],
      exports: ['createHttpServer', 'createWsServer'],
    },
    {
      name: 'routing',
      path: 'src/routing',
      responsibility: 'Route registration, URL matching, API versioning',
      dependencies: ['transport', 'middleware', 'controllers'],
      exports: ['Router', 'RouteLoader', 'apiVersioning'],
    },
    {
      name: 'middleware',
      path: 'src/middleware',
      responsibility: 'Request/response pipeline — auth, validation, rate limiting, CORS, logging, error handling',
      dependencies: ['core/errors', 'core/logger', 'auth', 'validation'],
      exports: ['pipeline', 'cors', 'authMiddleware', 'validationMiddleware', 'rateLimiter', 'requestLogger', 'errorHandler'],
    },
    {
      name: 'controllers',
      path: 'src/controllers',
      responsibility: 'Request handling — parse input, call services, format output',
      dependencies: ['services', 'core/errors'],
      exports: ['BaseController', 'HealthController'],
    },
    {
      name: 'services',
      path: 'src/services',
      responsibility: 'Business logic, orchestration, transactions',
      dependencies: ['data', 'core/events', 'core/logger'],
      exports: ['BaseService'],
    },
    {
      name: 'data',
      path: 'src/data',
      responsibility: 'Database connections, models, repositories, migrations',
      dependencies: ['core/config', 'core/logger'],
      exports: ['connection', 'BaseModel', 'BaseRepository'],
    },
    {
      name: 'auth',
      path: 'src/auth',
      responsibility: 'Authentication strategies (JWT, API key), token lifecycle',
      dependencies: ['core/config', 'core/errors'],
      exports: ['jwtStrategy', 'apiKeyStrategy'],
    },
    {
      name: 'validation',
      path: 'src/validation',
      responsibility: 'Request schema validation and sanitisation',
      dependencies: ['core/errors'],
      exports: ['Validator', 'schemas'],
    },
    {
      name: 'core/errors',
      path: 'src/core/errors',
      responsibility: 'Structured error types and error codes',
      dependencies: [],
      exports: ['AppError', 'ErrorCodes'],
    },
    {
      name: 'core/logger',
      path: 'src/core/logger',
      responsibility: 'Structured logging with levels and transports',
      dependencies: ['core/config'],
      exports: ['Logger', 'createLogger'],
    },
    {
      name: 'core/config',
      path: 'src/core/config',
      responsibility: 'Layered configuration loading and validation',
      dependencies: [],
      exports: ['ConfigLoader', 'configSchema'],
    },
    {
      name: 'core/events',
      path: 'src/core/events',
      responsibility: 'In-process event bus for decoupled communication',
      dependencies: [],
      exports: ['EventBus'],
    },
    {
      name: 'core/di',
      path: 'src/core/di',
      responsibility: 'Dependency injection container',
      dependencies: [],
      exports: ['Container'],
    },
    {
      name: 'utils',
      path: 'src/utils',
      responsibility: 'Shared utilities — async handler, response builder',
      dependencies: [],
      exports: ['asyncHandler', 'ResponseBuilder'],
    },
  ],

  config: {
    files: [
      'config/default.json',
      'config/environments/development.json',
      'config/environments/production.json',
      'config/environments/test.json',
      '.env.example',
    ],
    format: 'json',
  },

  integrations: [
    'claude-code',
    'docker',
    'github-actions',
    'jwt',
    'database',
  ],

  metadata: {
    estimatedFiles: 62,
    complexity: 'medium',
    layers: ['transport', 'routing', 'middleware', 'controller', 'service', 'data', 'config'],
  },
};

/**
 * Recommended blueprint fragments from the registry for an API project.
 * @type {string[]}
 */
const recommendedFragments = [
  'error-handling',
  'logging',
  'config-system',
  'middleware-pipeline',
  'rest-api',
  'event-bus',
  'dependency-injection',
  'test-runner',
  'docker-setup',
  'github-actions',
  'claude-md',
  'claude-settings',
  'claude-commands',
];

/**
 * Patterns recommended for API frameworks.
 * @type {{name: string, description: string, reason: string}[]}
 */
const recommendedPatterns = [
  { name: 'Repository Pattern', description: 'Abstract data access behind a repository interface', reason: 'Decouples business logic from storage implementation' },
  { name: 'Middleware Pipeline', description: 'Composable request/response pipeline', reason: 'Separates cross-cutting concerns (auth, logging, validation)' },
  { name: 'Dependency Injection', description: 'Invert control via constructor injection', reason: 'Enables testing and swapping implementations' },
  { name: 'Circuit Breaker', description: 'Fault tolerance for external service calls', reason: 'Prevents cascading failures in distributed systems' },
  { name: 'API Versioning', description: 'URL-prefix or header-based version strategy', reason: 'Enables non-breaking API evolution' },
  { name: 'Response Envelope', description: 'Standardised JSON response wrapper', reason: 'Consistent client-side error handling' },
];

export { apiBlueprint, recommendedFragments, recommendedPatterns };
export default apiBlueprint;
