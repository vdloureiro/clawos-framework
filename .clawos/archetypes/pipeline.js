/**
 * @module archetypes/pipeline
 * @description Architecture archetype for pipeline-style frameworks.
 * Data flows through sequential processing stages.
 */

const PIPELINE_ARCHETYPE = {
  id: 'pipeline',
  name: 'Pipeline Architecture',
  description: 'Data flows through a series of processing stages. Each stage transforms the input and passes it to the next. Ideal for data processing, compilers, and middleware chains.',

  traits: [
    'Linear data flow through ordered stages',
    'Each stage is independent and composable',
    'Easy to add, remove, or reorder stages',
    'Natural fit for data transformation and processing',
    'Supports both synchronous and streaming pipelines',
    'Each stage can be tested in isolation',
  ],

  bestFor: ['data', 'testing', 'automation', 'api'],

  layers: [
    { name: 'Input', responsibility: 'Data ingestion — sources, parsers, validators', modules: ['source', 'parser', 'validator'] },
    { name: 'Processing', responsibility: 'Data transformation — filters, mappers, aggregators', modules: ['transform', 'filter', 'aggregator'] },
    { name: 'Output', responsibility: 'Data delivery — sinks, formatters, writers', modules: ['sink', 'formatter', 'writer'] },
    { name: 'Control', responsibility: 'Pipeline management — scheduling, monitoring, error handling', modules: ['scheduler', 'monitor', 'error-handler'] },
  ],

  directoryTemplate: {
    'src/': {
      'pipeline/': ['builder.js', 'executor.js', 'context.js'],
      'stages/': {
        'sources/': ['__source__.js'],
        'transforms/': ['__transform__.js'],
        'sinks/': ['__sink__.js'],
      },
      'operators/': ['map.js', 'filter.js', 'reduce.js', 'batch.js', 'parallel.js'],
      'monitoring/': ['metrics.js', 'logger.js'],
      'config/': ['index.js'],
      'index.js': 'Entry point',
    },
    'tests/': {
      'stages/': [],
      'pipelines/': [],
    },
  },

  patterns: [
    'Pipes and Filters — composable processing stages',
    'Builder Pattern — fluent pipeline construction',
    'Strategy Pattern — interchangeable stage implementations',
    'Observer Pattern — monitor pipeline progress',
    'Decorator Pattern — wrap stages with logging/metrics',
    'Chain of Responsibility — error propagation',
  ],

  scalabilityProfile: {
    horizontal: true,
    stateless: true,
    cacheStrategy: 'stage-level caching',
    loadBalancing: 'partition by data',
  },

  communicationPatterns: ['Function composition', 'Async iterators', 'Node.js Streams', 'Generator functions'],
};

export default PIPELINE_ARCHETYPE;
