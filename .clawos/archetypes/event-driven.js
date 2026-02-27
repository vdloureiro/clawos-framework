/**
 * @module archetypes/event-driven
 * @description Architecture archetype for event-driven frameworks.
 * Components communicate through events/messages.
 */

const EVENT_DRIVEN_ARCHETYPE = {
  id: 'event-driven',
  name: 'Event-Driven Architecture',
  description: 'Components communicate through events and messages. Loose coupling via publish/subscribe, event sourcing, and reactive patterns.',

  traits: [
    'Asynchronous communication between components',
    'Loose coupling via events — producers do not know consumers',
    'Eventual consistency over strong consistency',
    'Natural fit for real-time and streaming systems',
    'Easy to extend — new consumers without changing producers',
    'Event sourcing enables full audit trail',
  ],

  bestFor: ['automation', 'data', 'ai-agent', 'plugin'],

  layers: [
    { name: 'Event Bus', responsibility: 'Central event routing and delivery', modules: ['event-bus', 'topic-registry', 'event-store'] },
    { name: 'Producers', responsibility: 'Emit domain events', modules: ['event-emitter', 'command-handler', 'scheduler'] },
    { name: 'Consumers', responsibility: 'React to events', modules: ['event-handler', 'saga', 'projector'] },
    { name: 'Infrastructure', responsibility: 'Persistence, logging, monitoring', modules: ['event-store', 'logger', 'metrics'] },
  ],

  directoryTemplate: {
    'src/': {
      'events/': ['event-bus.js', 'event-store.js', 'types.js'],
      'producers/': ['__producer__.js'],
      'consumers/': ['__consumer__.js'],
      'sagas/': ['__saga__.js'],
      'projections/': ['__projection__.js'],
      'commands/': ['command-bus.js', 'handlers/'],
      'shared/': ['utils.js', 'errors.js'],
      'config/': ['index.js'],
      'index.js': 'Entry point',
    },
    'tests/': {
      'unit/': [],
      'integration/': [],
    },
  },

  patterns: [
    'Publish/Subscribe — decouple producers from consumers',
    'Event Sourcing — store all state changes as events',
    'CQRS — separate read and write models',
    'Saga — manage distributed transactions via events',
    'Event Store — persistent, ordered log of all events',
    'Projections — build read models from event streams',
  ],

  scalabilityProfile: {
    horizontal: true,
    stateless: true,
    cacheStrategy: 'event-replay',
    loadBalancing: 'consumer groups',
  },

  communicationPatterns: ['EventEmitter', 'Message Queue', 'Pub/Sub', 'WebSocket'],
};

export default EVENT_DRIVEN_ARCHETYPE;
