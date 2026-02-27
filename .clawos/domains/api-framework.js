/**
 * @module domains/api-framework
 * @description Domain knowledge for API/Backend framework generation.
 * Contains patterns, best practices, and architectural guidance for REST, GraphQL, and hybrid APIs.
 */

const API_FRAMEWORK_DOMAIN = {
  id: 'api',
  name: 'API / Backend Framework',
  description: 'Frameworks for building REST APIs, GraphQL servers, WebSocket services, and backend systems',

  /** Core concepts that every API framework must address */
  coreConcepts: [
    'routing',
    'middleware',
    'request-parsing',
    'response-formatting',
    'error-handling',
    'validation',
    'authentication',
    'authorization',
    'rate-limiting',
    'logging',
    'cors',
    'serialization',
  ],

  /** Architectural styles this domain supports */
  architecturalStyles: {
    rest: {
      name: 'RESTful API',
      description: 'Resource-oriented architecture with HTTP verbs',
      patterns: ['router', 'controller', 'service', 'repository', 'middleware-chain'],
      conventions: [
        'Use HTTP verbs (GET, POST, PUT, PATCH, DELETE) semantically',
        'Resource URIs should be nouns, not verbs',
        'Use proper HTTP status codes',
        'Support pagination, filtering, and sorting',
        'Version APIs via URL prefix or header',
        'Use JSON as default response format',
      ],
    },
    graphql: {
      name: 'GraphQL API',
      description: 'Query-based API with typed schema',
      patterns: ['schema', 'resolver', 'dataloader', 'middleware'],
      conventions: [
        'Define types and queries in schema-first approach',
        'Use DataLoader for N+1 query prevention',
        'Implement proper error types',
        'Support subscriptions for real-time',
        'Use input types for mutations',
      ],
    },
    hybrid: {
      name: 'Hybrid (REST + GraphQL)',
      description: 'Combined REST and GraphQL with shared service layer',
      patterns: ['router', 'schema', 'service', 'repository'],
      conventions: [
        'Share business logic in service layer',
        'REST for CRUD, GraphQL for complex queries',
        'Unified authentication across both',
      ],
    },
  },

  /** Standard directory structure for API frameworks */
  directoryStructure: {
    src: {
      routes: 'Route definitions — maps URLs to handlers',
      controllers: 'Request handlers — parse input, call services, format output',
      services: 'Business logic — domain rules, orchestration',
      models: 'Data models — schema definitions, validation',
      middleware: 'Middleware functions — auth, logging, cors, etc.',
      validators: 'Input validation schemas and functions',
      utils: 'Shared utilities — helpers, formatters',
      config: 'Configuration management',
      errors: 'Custom error classes',
      'index.js': 'Application entry point',
      'server.js': 'Server setup and initialization',
    },
    tests: {
      unit: 'Unit tests for services and utils',
      integration: 'Integration tests for routes',
      fixtures: 'Test data and mocks',
    },
  },

  /** Required modules for any API framework */
  requiredModules: [
    {
      name: 'Router',
      responsibility: 'Map HTTP methods and paths to handler functions',
      patterns: ['trie-based routing', 'regex matching', 'parameterized routes'],
      interface: {
        methods: ['get(path, ...handlers)', 'post(path, ...handlers)', 'put(path, ...handlers)', 'delete(path, ...handlers)', 'use(middleware)', 'group(prefix, router)'],
      },
    },
    {
      name: 'Middleware Engine',
      responsibility: 'Execute middleware chain in order with next() pattern',
      patterns: ['onion model', 'linear chain', 'conditional middleware'],
      interface: {
        methods: ['use(fn)', 'run(ctx)', 'before(fn)', 'after(fn)', 'error(fn)'],
      },
    },
    {
      name: 'Request Context',
      responsibility: 'Encapsulate request data, params, query, body, headers',
      patterns: ['context object', 'request wrapper'],
      interface: {
        properties: ['params', 'query', 'body', 'headers', 'method', 'path', 'ip'],
        methods: ['get(header)', 'is(type)', 'accepts(types)'],
      },
    },
    {
      name: 'Response Builder',
      responsibility: 'Build and send HTTP responses',
      patterns: ['fluent interface', 'builder pattern'],
      interface: {
        methods: ['status(code)', 'json(data)', 'send(body)', 'header(key, value)', 'redirect(url)', 'stream(readable)'],
      },
    },
    {
      name: 'Error Handler',
      responsibility: 'Catch and format errors into proper HTTP responses',
      patterns: ['centralized handler', 'error middleware'],
      interface: {
        methods: ['handle(error, ctx)', 'register(ErrorClass, handler)', 'notFound(ctx)', 'serverError(ctx)'],
      },
    },
    {
      name: 'Validator',
      responsibility: 'Validate request input (body, params, query)',
      patterns: ['schema validation', 'decorator validation'],
      interface: {
        methods: ['validate(schema, data)', 'body(schema)', 'params(schema)', 'query(schema)'],
      },
    },
  ],

  /** Optional modules based on requirements */
  optionalModules: [
    { name: 'Authentication', triggers: ['auth', 'login', 'jwt', 'oauth', 'session'], provides: ['JWT auth', 'OAuth2', 'API keys', 'session-based'] },
    { name: 'Rate Limiter', triggers: ['rate', 'limit', 'throttle', 'ddos'], provides: ['token bucket', 'sliding window', 'fixed window'] },
    { name: 'Cache Layer', triggers: ['cache', 'redis', 'memcached', 'performance'], provides: ['in-memory cache', 'Redis adapter', 'cache middleware'] },
    { name: 'Database Adapter', triggers: ['database', 'db', 'sql', 'mongo', 'postgres'], provides: ['connection pool', 'query builder', 'migrations'] },
    { name: 'WebSocket', triggers: ['websocket', 'ws', 'realtime', 'socket'], provides: ['WS server', 'room management', 'broadcasting'] },
    { name: 'File Upload', triggers: ['upload', 'file', 'multipart', 'storage'], provides: ['multipart parsing', 'storage adapters', 'file validation'] },
    { name: 'API Documentation', triggers: ['docs', 'swagger', 'openapi', 'documentation'], provides: ['OpenAPI spec', 'Swagger UI', 'auto-documentation'] },
    { name: 'Health Check', triggers: ['health', 'status', 'monitoring', 'uptime'], provides: ['health endpoint', 'dependency checks', 'metrics'] },
  ],

  /** Reference implementations for inspiration */
  referenceFrameworks: [
    { name: 'Express.js', style: 'minimalist', strength: 'ecosystem', weakness: 'callback-based' },
    { name: 'Fastify', style: 'performance-first', strength: 'speed + validation', weakness: 'smaller ecosystem' },
    { name: 'Hono', style: 'modern-minimal', strength: 'edge-ready + tiny', weakness: 'newer' },
    { name: 'Koa', style: 'elegant-async', strength: 'async/await native', weakness: 'less batteries' },
    { name: 'NestJS', style: 'enterprise', strength: 'structure + DI', weakness: 'complexity' },
  ],

  /** Code patterns specific to this domain */
  codePatterns: {
    serverSetup: `
import { createServer } from 'node:http';

export function createApp(options = {}) {
  const app = {
    routes: [],
    middleware: [],

    use(fn) { this.middleware.push(fn); return this; },
    get(path, ...handlers) { this.routes.push({ method: 'GET', path, handlers }); return this; },
    post(path, ...handlers) { this.routes.push({ method: 'POST', path, handlers }); return this; },

    listen(port, callback) {
      const server = createServer((req, res) => this._handleRequest(req, res));
      return server.listen(port, callback);
    }
  };
  return app;
}`,
    middlewarePattern: `
export function compose(middleware) {
  return function (ctx, next) {
    let index = -1;
    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      const fn = i === middleware.length ? next : middleware[i];
      if (!fn) return Promise.resolve();
      return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
    }
    return dispatch(0);
  };
}`,
    errorHandling: `
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function errorHandler(err, ctx) {
  const statusCode = err.statusCode || 500;
  const response = {
    error: { code: err.code || 'INTERNAL_ERROR', message: err.isOperational ? err.message : 'Internal Server Error' }
  };
  ctx.res.status(statusCode).json(response);
}`,
  },

  /** Testing strategies for API frameworks */
  testingStrategies: {
    unit: ['Test each route handler in isolation', 'Test middleware functions independently', 'Test validation schemas', 'Test service layer business logic'],
    integration: ['Test full request/response cycle', 'Test middleware chain execution', 'Test error handling flow', 'Test authentication flow'],
    e2e: ['Test API from client perspective', 'Test rate limiting behavior', 'Test CORS headers', 'Test content negotiation'],
  },
};

export default API_FRAMEWORK_DOMAIN;
