/**
 * @module archetypes/modular
 * @description Architecture archetype for modular/plugin-based frameworks.
 * Core + extensions model with explicit extension points.
 */

const MODULAR_ARCHETYPE = {
  id: 'modular',
  name: 'Modular / Plugin Architecture',
  description: 'Minimal core with functionality provided by modules/plugins. Extension points allow adding features without modifying the core. Ideal for extensible tools and platforms.',

  traits: [
    'Minimal core with well-defined extension points',
    'Plugins add functionality dynamically',
    'Loose coupling between core and extensions',
    'Supports third-party extensions',
    'Hot-reload capable (add/remove plugins at runtime)',
    'Clean separation between host and extensions',
  ],

  bestFor: ['plugin', 'cli', 'testing', 'automation'],

  layers: [
    { name: 'Core', responsibility: 'Minimal kernel — lifecycle, plugin loading, hook system', modules: ['kernel', 'plugin-loader', 'hook-registry'] },
    { name: 'Plugin API', responsibility: 'API surface exposed to plugins', modules: ['api-provider', 'context-builder', 'permission-guard'] },
    { name: 'Built-in Plugins', responsibility: 'Default functionality via first-party plugins', modules: ['builtin-*'] },
    { name: 'Extension Plugins', responsibility: 'Third-party / user plugins', modules: ['ext-*'] },
  ],

  directoryTemplate: {
    'src/': {
      'core/': ['kernel.js', 'plugin-loader.js', 'hook-registry.js', 'lifecycle.js'],
      'api/': ['plugin-api.js', 'context.js', 'permissions.js'],
      'plugins/': {
        'builtin/': ['__plugin__/index.js', '__plugin__/manifest.json'],
      },
      'shared/': ['utils.js', 'errors.js', 'types.js'],
      'config/': ['index.js', 'defaults.js'],
      'index.js': 'Entry point — initializes core and loads plugins',
    },
    'plugins/': 'External plugin directory (user-installed)',
    'tests/': {
      'core/': [],
      'plugins/': [],
    },
  },

  patterns: [
    'Plugin Architecture — core + extensions via interfaces',
    'Hook System — named extension points with priority ordering',
    'Dependency Injection — plugins receive their dependencies',
    'Facade Pattern — simplified API surface for plugins',
    'Capability Model — plugins declare what they can do',
    'Manifest Pattern — plugins describe themselves via manifest files',
  ],

  scalabilityProfile: {
    horizontal: false,
    stateless: false,
    cacheStrategy: 'per-plugin',
    loadBalancing: 'N/A — single process, extensible',
  },

  communicationPatterns: ['Hook execution', 'Event emission', 'API method calls', 'Shared context object'],
};

export default MODULAR_ARCHETYPE;
