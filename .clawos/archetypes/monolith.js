/**
 * @module archetypes/monolith
 * @description Architecture archetype for monolithic frameworks.
 * Single deployable unit with layered internal structure.
 */

const MONOLITH_ARCHETYPE = {
  id: 'monolith',
  name: 'Modular Monolith Architecture',
  description: 'Single deployable unit with well-structured internal modules. All code runs in one process with clear module boundaries.',

  traits: [
    'Single deployment unit',
    'Shared database and runtime',
    'In-process function calls between modules',
    'Simpler deployment and debugging',
    'Strong consistency guarantees',
    'Well-defined module boundaries prevent spaghetti code',
  ],

  bestFor: ['cli', 'testing', 'ui', 'plugin'],

  layers: [
    { name: 'Presentation', responsibility: 'User-facing layer — CLI, API, UI', modules: ['interface', 'formatter', 'validator'] },
    { name: 'Application', responsibility: 'Use cases and orchestration', modules: ['use-case', 'orchestrator', 'command-handler'] },
    { name: 'Domain', responsibility: 'Core business logic and rules', modules: ['model', 'service', 'rule-engine'] },
    { name: 'Infrastructure', responsibility: 'External adapters and utilities', modules: ['persistence', 'external-api', 'config', 'logger'] },
  ],

  directoryTemplate: {
    'src/': {
      'core/': ['index.js', 'types.js'],
      'modules/': {
        '__module__/': ['index.js', 'service.js', 'model.js', 'validator.js'],
      },
      'shared/': ['utils.js', 'errors.js', 'constants.js'],
      'config/': ['index.js', 'defaults.js'],
      'index.js': 'Entry point — exports public API',
    },
    'tests/': {
      'unit/': [],
      'integration/': [],
    },
  },

  patterns: [
    'Layered Architecture — clear separation of concerns',
    'Dependency Inversion — depend on abstractions, not concretions',
    'Factory Pattern — create instances without exposing creation logic',
    'Facade Pattern — simple interface to complex subsystem',
    'Repository Pattern — abstract data access',
    'Strategy Pattern — interchangeable algorithms',
  ],

  scalabilityProfile: {
    horizontal: false,
    stateless: false,
    cacheStrategy: 'in-memory',
    loadBalancing: 'single instance or vertical scaling',
  },

  communicationPatterns: ['Direct function calls', 'EventEmitter', 'Callback chains'],
};

export default MONOLITH_ARCHETYPE;
