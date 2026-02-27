/**
 * @module domains/plugin-framework
 * @description Domain knowledge for Plugin/Extension System framework generation.
 */

const PLUGIN_FRAMEWORK_DOMAIN = {
  id: 'plugin',
  name: 'Plugin / Extension Framework',
  description: 'Frameworks for building extensible applications with plugin systems, hook architectures, and extension marketplaces',

  coreConcepts: [
    'plugin-interface',
    'lifecycle-hooks',
    'dependency-resolution',
    'plugin-isolation',
    'hook-system',
    'extension-points',
    'plugin-discovery',
    'activation-events',
    'capability-system',
    'plugin-api',
    'sandboxing',
    'hot-reload',
  ],

  architecturalStyles: {
    hooks: {
      name: 'Hook-Based',
      description: 'Plugins register hooks into well-defined extension points (WordPress style)',
      patterns: ['hook-registry', 'filter-chain', 'action-hook', 'priority-queue'],
    },
    api: {
      name: 'API-Based',
      description: 'Plugins interact through a provided API object (VSCode style)',
      patterns: ['api-provider', 'contribution-point', 'activation-event', 'capability'],
    },
    middleware: {
      name: 'Middleware-Based',
      description: 'Plugins as middleware in a processing pipeline (Express style)',
      patterns: ['middleware-stack', 'next-function', 'error-middleware'],
    },
    module: {
      name: 'Module Federation',
      description: 'Runtime loading of remote modules (Webpack Module Federation style)',
      patterns: ['module-loader', 'remote-entry', 'shared-scope'],
    },
  },

  directoryStructure: {
    src: {
      core: 'Core application — the host that plugins extend',
      plugins: 'Plugin system — loader, registry, lifecycle',
      hooks: 'Hook system — registration, execution, filtering',
      api: 'Plugin API — what plugins can access',
      sandbox: 'Plugin sandboxing — isolation, permissions',
      loader: 'Plugin discovery and loading — npm, local, remote',
      marketplace: 'Plugin marketplace — search, install, update',
      utils: 'Utility functions',
      'index.js': 'Public API',
    },
  },

  requiredModules: [
    {
      name: 'Plugin Manager',
      responsibility: 'Discover, load, activate, and deactivate plugins',
      interface: {
        methods: ['discover(paths)', 'load(pluginId)', 'activate(pluginId)', 'deactivate(pluginId)', 'uninstall(pluginId)', 'getAll()', 'getActive()'],
      },
    },
    {
      name: 'Hook Registry',
      responsibility: 'Register and execute hooks at extension points',
      interface: {
        methods: ['register(hookName, handler, priority)', 'execute(hookName, context)', 'filter(hookName, value, context)', 'remove(hookName, handler)', 'getHooks(hookName)'],
      },
    },
    {
      name: 'Plugin API Provider',
      responsibility: 'Provide a scoped API surface to each plugin',
      interface: {
        methods: ['createAPI(pluginId, permissions)', 'exposeFunction(name, fn)', 'exposeEvent(name)', 'revokeAccess(pluginId)'],
      },
    },
    {
      name: 'Lifecycle Manager',
      responsibility: 'Manage plugin lifecycle events',
      interface: {
        methods: ['onActivate(pluginId, fn)', 'onDeactivate(pluginId, fn)', 'onError(pluginId, fn)', 'getState(pluginId)'],
      },
    },
  ],

  optionalModules: [
    { name: 'Sandbox', triggers: ['sandbox', 'isolation', 'security', 'permission'], provides: ['VM sandbox', 'permission system', 'resource limits'] },
    { name: 'Hot Reload', triggers: ['hot-reload', 'live', 'watch', 'hmr'], provides: ['file watching', 'module reload', 'state preservation'] },
    { name: 'Marketplace', triggers: ['marketplace', 'store', 'registry', 'publish'], provides: ['npm registry', 'search', 'install', 'versioning'] },
    { name: 'Configuration', triggers: ['config', 'settings', 'preferences'], provides: ['plugin settings schema', 'settings UI', 'default values'] },
    { name: 'Dependency Manager', triggers: ['dependency', 'require', 'peer'], provides: ['dependency resolution', 'version compatibility', 'conflict detection'] },
  ],

  referenceFrameworks: [
    { name: 'VSCode Extensions', style: 'api-based', strength: 'rich API + marketplace' },
    { name: 'WordPress Hooks', style: 'hook-based', strength: 'simple + powerful' },
    { name: 'Rollup Plugins', style: 'hook-based', strength: 'build tool plugins' },
    { name: 'Fastify Plugins', style: 'encapsulated', strength: 'scoped + composable' },
    { name: 'Grafana Plugins', style: 'panel-based', strength: 'UI extension model' },
  ],

  codePatterns: {
    pluginManager: `
export class PluginManager {
  #plugins = new Map();
  #active = new Set();

  register(manifest) {
    const plugin = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      activate: manifest.activate,
      deactivate: manifest.deactivate,
      state: 'registered',
    };
    this.#plugins.set(manifest.id, plugin);
    return plugin;
  }

  async activate(pluginId) {
    const plugin = this.#plugins.get(pluginId);
    if (!plugin) throw new Error(\`Plugin not found: \${pluginId}\`);
    const api = this.#createPluginAPI(pluginId);
    await plugin.activate(api);
    plugin.state = 'active';
    this.#active.add(pluginId);
  }

  async deactivate(pluginId) {
    const plugin = this.#plugins.get(pluginId);
    if (plugin?.deactivate) await plugin.deactivate();
    plugin.state = 'inactive';
    this.#active.delete(pluginId);
  }
}`,
    hookSystem: `
export class HookRegistry {
  #hooks = new Map();

  register(name, handler, priority = 10) {
    if (!this.#hooks.has(name)) this.#hooks.set(name, []);
    this.#hooks.get(name).push({ handler, priority });
    this.#hooks.get(name).sort((a, b) => a.priority - b.priority);
  }

  async execute(name, context = {}) {
    const hooks = this.#hooks.get(name) || [];
    const results = [];
    for (const { handler } of hooks) {
      results.push(await handler(context));
    }
    return results;
  }

  async filter(name, value, context = {}) {
    const hooks = this.#hooks.get(name) || [];
    let result = value;
    for (const { handler } of hooks) {
      result = await handler(result, context);
    }
    return result;
  }
}`,
  },

  testingStrategies: {
    unit: ['Test plugin loading and activation', 'Test hook registration and execution', 'Test API scoping per plugin', 'Test lifecycle state transitions'],
    integration: ['Test multiple plugins interacting', 'Test plugin dependency resolution', 'Test hot-reload cycle', 'Test plugin isolation'],
  },
};

export default PLUGIN_FRAMEWORK_DOMAIN;
