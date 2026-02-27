/**
 * @module archetypes/microservice
 * @description Architecture archetype for microservice-style frameworks.
 * Small, focused services communicating via APIs/events.
 */

const MICROSERVICE_ARCHETYPE = {
  id: 'microservice',
  name: 'Microservice Architecture',
  description: 'Small, independently deployable services with well-defined boundaries. Each module is self-contained with its own data and API.',

  traits: [
    'Single responsibility per service/module',
    'Independent deployment and scaling',
    'Communication via APIs or message queues',
    'Decentralized data management',
    'Fault isolation between services',
    'Technology-agnostic boundaries',
  ],

  bestFor: ['api', 'automation', 'data', 'ai-agent'],

  layers: [
    { name: 'Gateway', responsibility: 'Entry point — routing, auth, rate limiting', modules: ['router', 'auth-middleware', 'rate-limiter'] },
    { name: 'Service', responsibility: 'Business logic — domain rules, orchestration', modules: ['service-core', 'event-handler', 'validator'] },
    { name: 'Data', responsibility: 'Data access — repositories, caches, adapters', modules: ['repository', 'cache', 'connector'] },
    { name: 'Infrastructure', responsibility: 'Cross-cutting — logging, config, health', modules: ['logger', 'config', 'health-check'] },
  ],

  directoryTemplate: {
    'src/': {
      'gateway/': ['router.js', 'middleware.js', 'auth.js'],
      'services/': ['__service__/index.js', '__service__/handler.js', '__service__/validator.js'],
      'data/': ['repository.js', 'connector.js', 'cache.js'],
      'infra/': ['logger.js', 'config.js', 'health.js'],
      'events/': ['event-bus.js', 'handlers.js'],
      'index.js': 'Entry point',
      'server.js': 'Server setup',
    },
    'tests/': {
      'unit/': [],
      'integration/': [],
    },
    'config/': ['default.json', 'production.json'],
  },

  patterns: [
    'Service Registry — discover and communicate between modules',
    'Circuit Breaker — prevent cascade failures',
    'Event Sourcing — track all state changes as events',
    'API Gateway — single entry point for all clients',
    'Health Check — each module reports its status',
    'Config Externalization — environment-based configuration',
  ],

  scalabilityProfile: {
    horizontal: true,
    stateless: true,
    cacheStrategy: 'distributed',
    loadBalancing: 'round-robin or least-connections',
  },

  communicationPatterns: ['REST API', 'Event Bus', 'Message Queue', 'gRPC'],
};

export default MICROSERVICE_ARCHETYPE;
