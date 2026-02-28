/**
 * @module BlueprintEngine
 * @description Core engine that composes architecture blueprints from requirements profiles.
 * Selects optimal architectures, composes patterns, generates directory structures,
 * module dependency graphs, and file manifests for the ClawOS meta-framework.
 *
 * @author ClawOS Framework
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Deep-merge two plain objects (arrays are concatenated, primitives overwritten).
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      output[key] = deepMerge(target[key], source[key]);
    } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
      output[key] = [...target[key], ...source[key]];
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * Deduplicate an array of strings.
 * @param {string[]} arr
 * @returns {string[]}
 */
function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Generate a short deterministic id from a string seed.
 * @param {string} seed
 * @returns {string}
 */
function hashId(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return 'bp_' + Math.abs(h).toString(36);
}

// ---------------------------------------------------------------------------
// Archetype definitions — canonical project shapes
// ---------------------------------------------------------------------------

/**
 * @typedef {'api'|'cli'|'ai-agent'|'library'|'fullstack'|'microservice'|'monorepo'|'universal'} Archetype
 */

/** @type {Record<Archetype, {layers: string[], complexity: string, description: string}>} */
const ARCHETYPES = {
  api: {
    layers: ['transport', 'routing', 'middleware', 'controller', 'service', 'data', 'config'],
    complexity: 'medium',
    description: 'HTTP/WebSocket API server with layered architecture',
  },
  cli: {
    layers: ['parser', 'command', 'service', 'output', 'config'],
    complexity: 'low',
    description: 'Command-line interface application',
  },
  'ai-agent': {
    layers: ['orchestrator', 'planner', 'memory', 'tool', 'model-adapter', 'guardrail', 'config'],
    complexity: 'high',
    description: 'Autonomous AI agent with planning, memory, and tool use',
  },
  library: {
    layers: ['public-api', 'core', 'util', 'types'],
    complexity: 'low',
    description: 'Reusable library/package',
  },
  fullstack: {
    layers: ['client', 'server', 'shared', 'database', 'config'],
    complexity: 'high',
    description: 'Full-stack web application',
  },
  microservice: {
    layers: ['gateway', 'service', 'messaging', 'data', 'config'],
    complexity: 'medium',
    description: 'Microservice with event-driven communication',
  },
  monorepo: {
    layers: ['packages', 'shared', 'tools', 'config'],
    complexity: 'high',
    description: 'Multi-package monorepo',
  },
  universal: {
    layers: ['core', 'adapters', 'plugins', 'config', 'testing'],
    complexity: 'medium',
    description: 'Universal/hybrid framework adaptable to any domain',
  },
};

// ---------------------------------------------------------------------------
// Heuristic scoring
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RequirementsProfile
 * @property {string}   name              - Project name
 * @property {string}   [description]     - Short description
 * @property {string}   [domain]          - Target domain (web, cli, ai, devtool, etc.)
 * @property {string}   [archetype]       - Explicit archetype override
 * @property {string[]} [features]        - Desired capabilities
 * @property {string[]} [integrations]    - External integrations
 * @property {string}   [language]        - Primary language (default: javascript)
 * @property {string}   [configFormat]    - Preferred config format (yaml|json|toml)
 * @property {boolean}  [claudeIntegration] - Whether to add Claude Code helpers
 * @property {boolean}  [testing]         - Whether testing scaffolding is desired
 * @property {boolean}  [docker]          - Whether Docker setup is desired
 * @property {boolean}  [ci]              - Whether CI/CD setup is desired
 * @property {Object}   [extra]           - Arbitrary extra metadata
 */

/**
 * Keywords that map loosely to archetypes for heuristic detection.
 * @type {Record<Archetype, string[]>}
 */
const ARCHETYPE_KEYWORDS = {
  api: ['rest', 'http', 'server', 'endpoint', 'graphql', 'websocket', 'express', 'fastify', 'api'],
  cli: ['cli', 'command', 'terminal', 'argv', 'shell', 'prompt', 'repl'],
  'ai-agent': ['agent', 'llm', 'ai', 'planner', 'reasoning', 'tool-use', 'autonomous', 'rag', 'embedding'],
  library: ['library', 'package', 'sdk', 'module', 'util', 'helper'],
  fullstack: ['fullstack', 'frontend', 'backend', 'react', 'vue', 'svelte', 'nextjs', 'webapp'],
  microservice: ['microservice', 'event-driven', 'queue', 'message', 'pubsub', 'kafka', 'rabbitmq'],
  monorepo: ['monorepo', 'workspace', 'multi-package', 'lerna', 'turborepo'],
  universal: ['universal', 'hybrid', 'framework', 'meta', 'scaffold', 'generator'],
};

/**
 * Score each archetype against the given profile and return ranked list.
 * @param {RequirementsProfile} profile
 * @returns {{archetype: Archetype, score: number}[]}
 */
function scoreArchetypes(profile) {
  const text = [
    profile.name,
    profile.description || '',
    profile.domain || '',
    ...(profile.features || []),
    ...(profile.integrations || []),
  ]
    .join(' ')
    .toLowerCase();

  /** @type {{archetype: Archetype, score: number}[]} */
  const scores = [];

  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1;
    }
    // Bonus if domain matches directly
    if (profile.domain && archetype.includes(profile.domain.toLowerCase())) {
      score += 3;
    }
    scores.push({ archetype: /** @type {Archetype} */ (archetype), score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ---------------------------------------------------------------------------
// Blueprint composition helpers
// ---------------------------------------------------------------------------

/**
 * Build the directory tree for a blueprint.
 * @param {string} projectName
 * @param {Archetype} archetype
 * @param {RequirementsProfile} profile
 * @returns {{directories: string[], files: {path: string, description: string, template: string|null}[]}}
 */
function buildStructure(projectName, archetype, profile) {
  const meta = ARCHETYPES[archetype];
  if (!meta) {
    throw new Error(`Unknown archetype: ${archetype}`);
  }

  /** @type {string[]} */
  const directories = [
    projectName,
    `${projectName}/src`,
    `${projectName}/src/core`,
    `${projectName}/config`,
    `${projectName}/docs`,
  ];

  /** @type {{path: string, description: string, template: string|null}[]} */
  const files = [
    { path: `${projectName}/package.json`, description: 'Package manifest', template: 'package-json' },
    { path: `${projectName}/README.md`, description: 'Project documentation', template: 'readme' },
    { path: `${projectName}/.gitignore`, description: 'Git ignore rules', template: 'gitignore' },
    { path: `${projectName}/src/index.js`, description: 'Application entry point', template: 'entry' },
  ];

  // Layer-specific directories and files
  for (const layer of meta.layers) {
    const dir = `${projectName}/src/${layer}`;
    directories.push(dir);
    files.push({
      path: `${dir}/index.js`,
      description: `${layer} layer barrel export`,
      template: 'barrel',
    });
  }

  // Config files
  const configFormat = profile.configFormat || 'json';
  const configExt = configFormat === 'yaml' ? '.yaml' : configFormat === 'toml' ? '.toml' : '.json';
  files.push({
    path: `${projectName}/config/default${configExt}`,
    description: `Default configuration (${configFormat})`,
    template: 'config-default',
  });

  // Testing
  if (profile.testing !== false) {
    directories.push(`${projectName}/tests`, `${projectName}/tests/unit`, `${projectName}/tests/integration`);
    files.push(
      { path: `${projectName}/tests/setup.js`, description: 'Test environment setup', template: 'test-setup' },
      {
        path: `${projectName}/tests/unit/core.test.js`,
        description: 'Core unit tests',
        template: 'test-unit',
      },
    );
  }

  // Claude Code integration
  if (profile.claudeIntegration !== false) {
    files.push(
      { path: `${projectName}/CLAUDE.md`, description: 'Claude Code project context', template: 'claude-md' },
      {
        path: `${projectName}/.claude/settings.json`,
        description: 'Claude Code settings',
        template: 'claude-settings',
      },
    );
    directories.push(`${projectName}/.claude`);
  }

  // Docker
  if (profile.docker) {
    files.push(
      { path: `${projectName}/Dockerfile`, description: 'Docker container definition', template: 'dockerfile' },
      {
        path: `${projectName}/docker-compose.yml`,
        description: 'Docker Compose services',
        template: 'docker-compose',
      },
      { path: `${projectName}/.dockerignore`, description: 'Docker ignore rules', template: 'dockerignore' },
    );
  }

  // CI
  if (profile.ci) {
    directories.push(`${projectName}/.github`, `${projectName}/.github/workflows`);
    files.push({
      path: `${projectName}/.github/workflows/ci.yml`,
      description: 'GitHub Actions CI pipeline',
      template: 'github-actions-ci',
    });
  }

  return { directories: unique(directories).sort(), files };
}

/**
 * Build the module dependency graph.
 * @param {string} projectName
 * @param {Archetype} archetype
 * @param {RequirementsProfile} profile
 * @returns {{name: string, path: string, responsibility: string, dependencies: string[], exports: string[]}[]}
 */
function buildModuleGraph(projectName, archetype, profile) {
  const meta = ARCHETYPES[archetype];
  if (!meta) return [];

  /** @type {{name: string, path: string, responsibility: string, dependencies: string[], exports: string[]}[]} */
  const modules = [];

  const layerDeps = {};
  for (let i = 0; i < meta.layers.length; i++) {
    layerDeps[meta.layers[i]] = i > 0 ? [meta.layers[i - 1]] : [];
  }

  for (const layer of meta.layers) {
    modules.push({
      name: layer,
      path: `${projectName}/src/${layer}`,
      responsibility: `Handles ${layer} concerns`,
      dependencies: layerDeps[layer] || [],
      exports: [`${layer}Module`, `create${capitalize(layer)}`],
    });
  }

  // Core is always present
  if (!meta.layers.includes('core')) {
    modules.unshift({
      name: 'core',
      path: `${projectName}/src/core`,
      responsibility: 'Core utilities and shared logic',
      dependencies: [],
      exports: ['coreModule'],
    });
  }

  return modules;
}

/**
 * Capitalize the first letter of a string.
 * @param {string} s
 * @returns {string}
 */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// BlueprintEngine class
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Blueprint
 * @property {string}   name
 * @property {string}   description
 * @property {Archetype} archetype
 * @property {string}   domain
 * @property {{directories: string[], files: {path: string, description: string, template: string|null}[]}} structure
 * @property {{name: string, path: string, responsibility: string, dependencies: string[], exports: string[]}[]} modules
 * @property {{files: string[], format: string}} config
 * @property {string[]} integrations
 * @property {{estimatedFiles: number, complexity: string, layers: string[]}} metadata
 */

class BlueprintEngine {
  /** @type {Blueprint|null} */
  #currentBlueprint = null;

  /** @type {Map<string, Object>} */
  #overlays = new Map();

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Compose a complete blueprint from a requirements profile.
   *
   * The engine will:
   * 1. Resolve the best-fit archetype (or use an explicit override).
   * 2. Build the directory structure for that archetype.
   * 3. Generate the module dependency graph.
   * 4. Collect config file references.
   * 5. Attach integration metadata.
   * 6. Apply any registered overlays (extra patterns / fragments).
   *
   * @param {RequirementsProfile} profile
   * @returns {Blueprint}
   */
  compose(profile) {
    if (!profile || !profile.name) {
      throw new Error('BlueprintEngine.compose: profile.name is required');
    }

    const archetype = this.#resolveArchetype(profile);
    const meta = ARCHETYPES[archetype];
    const domain = profile.domain || archetype;
    const projectName = profile.name;

    const structure = buildStructure(projectName, archetype, profile);
    const modules = buildModuleGraph(projectName, archetype, profile);

    const configFormat = profile.configFormat || 'json';
    const configFiles = structure.files
      .filter((f) => f.path.includes('/config/'))
      .map((f) => f.path);

    const integrations = [...(profile.integrations || [])];
    if (profile.claudeIntegration !== false && !integrations.includes('claude-code')) {
      integrations.push('claude-code');
    }
    if (profile.docker && !integrations.includes('docker')) {
      integrations.push('docker');
    }
    if (profile.ci && !integrations.includes('github-actions')) {
      integrations.push('github-actions');
    }

    /** @type {Blueprint} */
    let blueprint = {
      name: projectName,
      description: profile.description || `${capitalize(archetype)} project: ${projectName}`,
      archetype,
      domain,
      structure,
      modules,
      config: {
        files: configFiles,
        format: configFormat,
      },
      integrations: unique(integrations),
      metadata: {
        estimatedFiles: structure.files.length,
        complexity: meta.complexity,
        layers: [...meta.layers],
      },
    };

    // Apply overlays (composed fragments from registry, etc.)
    for (const [, overlay] of this.#overlays) {
      blueprint = this.#applyOverlay(blueprint, overlay);
    }

    this.#currentBlueprint = blueprint;
    return blueprint;
  }

  /**
   * Return the directory tree of the last composed blueprint.
   * @returns {string[]}
   */
  getDirectoryTree() {
    this.#ensureComposed();
    return this.#currentBlueprint.structure.directories;
  }

  /**
   * Return the module dependency graph of the last composed blueprint.
   * @returns {{name: string, path: string, responsibility: string, dependencies: string[], exports: string[]}[]}
   */
  getModuleGraph() {
    this.#ensureComposed();
    return this.#currentBlueprint.modules;
  }

  /**
   * Return the file manifest (path + description) of the last composed blueprint.
   * @returns {{path: string, description: string, template: string|null}[]}
   */
  getFileManifest() {
    this.#ensureComposed();
    return this.#currentBlueprint.structure.files;
  }

  /**
   * Register an overlay that will be merged into every subsequent compose() call.
   * Overlays are keyed by id so they can be replaced or removed.
   *
   * An overlay is a partial Blueprint-shaped object whose arrays are concatenated
   * and whose objects are deep-merged into the base blueprint.
   *
   * @param {string} id   - Unique overlay identifier.
   * @param {Object} overlay - Partial blueprint data to merge.
   */
  addOverlay(id, overlay) {
    this.#overlays.set(id, overlay);
  }

  /**
   * Remove a previously registered overlay.
   * @param {string} id
   * @returns {boolean} Whether the overlay existed.
   */
  removeOverlay(id) {
    return this.#overlays.delete(id);
  }

  /**
   * Combine multiple blueprint outputs into one (multi-pattern composition).
   *
   * Useful when a project needs, for example, both an API blueprint and a
   * CLI blueprint merged into a single monorepo-style output.
   *
   * @param {Blueprint[]} blueprints
   * @returns {Blueprint}
   */
  combineBlueprints(blueprints) {
    if (!blueprints || blueprints.length === 0) {
      throw new Error('BlueprintEngine.combineBlueprints: at least one blueprint is required');
    }

    if (blueprints.length === 1) return blueprints[0];

    const base = structuredClone(blueprints[0]);

    for (let i = 1; i < blueprints.length; i++) {
      const bp = blueprints[i];
      base.name = `${base.name}+${bp.name}`;
      base.description = `${base.description} | ${bp.description}`;
      base.archetype = 'universal';
      base.domain = 'multi';
      base.structure.directories = unique([
        ...base.structure.directories,
        ...bp.structure.directories,
      ]).sort();
      base.structure.files = [
        ...base.structure.files,
        ...bp.structure.files.filter(
          (f) => !base.structure.files.some((bf) => bf.path === f.path),
        ),
      ];
      base.modules = [
        ...base.modules,
        ...bp.modules.filter((m) => !base.modules.some((bm) => bm.name === m.name)),
      ];
      base.config.files = unique([...base.config.files, ...bp.config.files]);
      base.integrations = unique([...base.integrations, ...bp.integrations]);
      base.metadata.estimatedFiles = base.structure.files.length;
      base.metadata.complexity = 'high';
      base.metadata.layers = unique([...base.metadata.layers, ...bp.metadata.layers]);
    }

    this.#currentBlueprint = base;
    return base;
  }

  /**
   * Compose agent definitions for a team-replacement blueprint.
   *
   * Given a list of agent role names, generates structured agent specs with
   * inferred capabilities, personas, and file paths.
   *
   * @param {string} projectName - The project name.
   * @param {string[]} agentNames - List of agent role names (e.g. ["code-reviewer", "qa-tester"]).
   * @returns {{name: string, persona: string, capabilities: string[], filePath: string}[]}
   */
  composeAgents(projectName, agentNames) {
    if (!agentNames || agentNames.length === 0) return [];

    return agentNames.map((name) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      return {
        name: slug,
        persona: this.#generatePersona(name),
        capabilities: this.#inferCapabilities(name),
        filePath: `${projectName}/src/agents/${slug}.agent.js`,
      };
    });
  }

  /**
   * Compose workflow definitions for a team-replacement blueprint.
   *
   * Given a list of workflow names, generates structured workflow specs with
   * inferred phases, dependencies, and file paths.
   *
   * @param {string} projectName - The project name.
   * @param {string[]} workflowNames - List of workflow names.
   * @param {string[]} [availableAgents=[]] - Agent names available for assignment.
   * @returns {{name: string, phases: {name: string, agent: string|null, description: string}[], filePath: string}[]}
   */
  composeWorkflows(projectName, workflowNames, availableAgents = []) {
    if (!workflowNames || workflowNames.length === 0) return [];

    return workflowNames.map((name) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      return {
        name: slug,
        phases: this.#inferPhases(name, availableAgents),
        filePath: `${projectName}/src/workflows/${slug}.workflow.js`,
      };
    });
  }

  /**
   * Enhanced compose that supports team-replacement profiles with agents and workflows.
   *
   * @param {RequirementsProfile} profile
   * @returns {Blueprint}
   */
  composeWithTeam(profile) {
    const blueprint = this.compose(profile);

    const teamReplacement = profile.teamReplacement || profile.extra?.teamReplacement;
    if (!teamReplacement || !teamReplacement.enabled) return blueprint;

    const agents = teamReplacement.agents || [];
    const workflows = teamReplacement.workflows || [];
    const projectName = profile.name;

    // Add agent directories and files
    if (agents.length > 0) {
      blueprint.structure.directories.push(`${projectName}/src/agents`);
      const agentSpecs = this.composeAgents(projectName, agents);
      for (const agent of agentSpecs) {
        blueprint.structure.files.push({
          path: agent.filePath,
          description: `${capitalize(agent.name)} agent — ${agent.persona}`,
          template: 'agent',
        });
      }
      blueprint.modules.push({
        name: 'agents',
        path: `${projectName}/src/agents`,
        responsibility: 'Autonomous agent definitions with personas and capabilities',
        dependencies: ['core'],
        exports: agentSpecs.map((a) => `${capitalize(a.name)}Agent`),
      });
    }

    // Add workflow directories and files
    if (workflows.length > 0) {
      blueprint.structure.directories.push(`${projectName}/src/workflows`);
      const workflowSpecs = this.composeWorkflows(projectName, workflows, agents);
      for (const wf of workflowSpecs) {
        blueprint.structure.files.push({
          path: wf.filePath,
          description: `${capitalize(wf.name)} workflow — ${wf.phases.length} phases`,
          template: 'workflow',
        });
      }
      blueprint.modules.push({
        name: 'workflows',
        path: `${projectName}/src/workflows`,
        responsibility: 'Multi-phase workflow orchestration with agent assignment',
        dependencies: ['agents', 'core'],
        exports: workflowSpecs.map((w) => `${capitalize(w.name)}Workflow`),
      });
    }

    // Add orchestrator if both agents and workflows exist
    if (agents.length > 0 && workflows.length > 0) {
      blueprint.structure.files.push({
        path: `${projectName}/src/orchestrator.js`,
        description: 'Central orchestrator — dispatches tasks to agents and runs workflows',
        template: 'orchestrator',
      });
      blueprint.modules.push({
        name: 'orchestrator',
        path: `${projectName}/src/orchestrator.js`,
        responsibility: 'Coordinates agents and workflows, dispatches tasks',
        dependencies: ['agents', 'workflows'],
        exports: ['Orchestrator', 'createOrchestrator'],
      });
    }

    // Update metadata
    blueprint.structure.directories = unique(blueprint.structure.directories).sort();
    blueprint.metadata.estimatedFiles = blueprint.structure.files.length;
    if (agents.length > 3 || workflows.length > 2) {
      blueprint.metadata.complexity = 'high';
    }

    return blueprint;
  }

  /**
   * Return the list of known archetypes and their metadata.
   * @returns {Record<Archetype, {layers: string[], complexity: string, description: string}>}
   */
  getArchetypes() {
    return { ...ARCHETYPES };
  }

  /**
   * Run heuristic scoring for a profile and return ranked archetype matches.
   * @param {RequirementsProfile} profile
   * @returns {{archetype: Archetype, score: number}[]}
   */
  rankArchetypes(profile) {
    return scoreArchetypes(profile);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve the best archetype for a profile.
   * @param {RequirementsProfile} profile
   * @returns {Archetype}
   */
  #resolveArchetype(profile) {
    if (profile.archetype && ARCHETYPES[profile.archetype]) {
      return /** @type {Archetype} */ (profile.archetype);
    }

    const ranked = scoreArchetypes(profile);
    // If top score is zero fall back to universal
    if (ranked[0].score === 0) return 'universal';
    return ranked[0].archetype;
  }

  /**
   * Apply an overlay (partial blueprint) onto a base blueprint.
   * @param {Blueprint} base
   * @param {Object} overlay
   * @returns {Blueprint}
   */
  #applyOverlay(base, overlay) {
    const result = structuredClone(base);

    if (overlay.structure) {
      if (overlay.structure.directories) {
        result.structure.directories = unique([
          ...result.structure.directories,
          ...overlay.structure.directories,
        ]).sort();
      }
      if (overlay.structure.files) {
        for (const file of overlay.structure.files) {
          if (!result.structure.files.some((f) => f.path === file.path)) {
            result.structure.files.push(file);
          }
        }
      }
    }

    if (overlay.modules) {
      for (const mod of overlay.modules) {
        if (!result.modules.some((m) => m.name === mod.name)) {
          result.modules.push(mod);
        }
      }
    }

    if (overlay.integrations) {
      result.integrations = unique([...result.integrations, ...overlay.integrations]);
    }

    if (overlay.config && overlay.config.files) {
      result.config.files = unique([...result.config.files, ...overlay.config.files]);
    }

    result.metadata.estimatedFiles = result.structure.files.length;

    return result;
  }

  /**
   * Guard that throws if no blueprint has been composed yet.
   */
  #ensureComposed() {
    if (!this.#currentBlueprint) {
      throw new Error('No blueprint composed yet. Call compose(profile) first.');
    }
  }

  /**
   * Generate a persona description for an agent role.
   * @param {string} roleName
   * @returns {string}
   */
  #generatePersona(roleName) {
    const lower = roleName.toLowerCase();
    const PERSONA_MAP = {
      'code-review': 'Senior code reviewer focused on quality, security, and best practices',
      'qa': 'Quality assurance specialist who designs and runs test strategies',
      'tester': 'Quality assurance specialist who designs and runs test strategies',
      'architect': 'Software architect who designs scalable, maintainable systems',
      'frontend': 'Frontend specialist focused on UI/UX, accessibility, and performance',
      'backend': 'Backend engineer focused on APIs, data, and system reliability',
      'devops': 'DevOps engineer focused on CI/CD, infrastructure, and deployment',
      'security': 'Security analyst focused on vulnerability detection and hardening',
      'docs': 'Technical writer who creates clear, comprehensive documentation',
      'documentation': 'Technical writer who creates clear, comprehensive documentation',
      'pm': 'Project manager who tracks progress, priorities, and deadlines',
      'project-manager': 'Project manager who tracks progress, priorities, and deadlines',
      'designer': 'UI/UX designer focused on user experience and visual design',
      'data': 'Data engineer focused on pipelines, analytics, and data quality',
      'analyst': 'Business analyst who gathers requirements and translates to specs',
      'support': 'Support specialist who handles issues, triages bugs, and communicates with users',
      'marketing': 'Marketing specialist focused on messaging, content, and growth',
    };

    for (const [key, persona] of Object.entries(PERSONA_MAP)) {
      if (lower.includes(key)) return persona;
    }
    return `Specialist agent for ${roleName} tasks`;
  }

  /**
   * Infer capabilities for an agent based on its role name.
   * @param {string} roleName
   * @returns {string[]}
   */
  #inferCapabilities(roleName) {
    const lower = roleName.toLowerCase();
    const CAPABILITY_MAP = {
      'code-review': ['read-code', 'analyze-patterns', 'suggest-fixes', 'check-style'],
      'qa': ['write-tests', 'run-tests', 'analyze-coverage', 'report-bugs'],
      'tester': ['write-tests', 'run-tests', 'analyze-coverage', 'report-bugs'],
      'architect': ['design-systems', 'create-diagrams', 'review-architecture', 'define-patterns'],
      'frontend': ['build-ui', 'style-components', 'handle-state', 'optimize-performance'],
      'backend': ['build-api', 'manage-data', 'handle-auth', 'optimize-queries'],
      'devops': ['setup-ci', 'configure-deploy', 'monitor-infra', 'manage-containers'],
      'security': ['scan-vulnerabilities', 'review-auth', 'audit-dependencies', 'harden-config'],
      'docs': ['write-docs', 'generate-api-ref', 'create-guides', 'maintain-changelog'],
      'documentation': ['write-docs', 'generate-api-ref', 'create-guides', 'maintain-changelog'],
      'pm': ['track-tasks', 'prioritize-backlog', 'report-status', 'manage-sprints'],
      'project-manager': ['track-tasks', 'prioritize-backlog', 'report-status', 'manage-sprints'],
      'designer': ['create-mockups', 'design-components', 'define-tokens', 'audit-accessibility'],
      'data': ['build-pipelines', 'transform-data', 'analyze-quality', 'optimize-queries'],
      'analyst': ['gather-requirements', 'write-specs', 'analyze-impact', 'create-user-stories'],
      'support': ['triage-issues', 'diagnose-bugs', 'write-responses', 'track-incidents'],
      'marketing': ['create-content', 'analyze-metrics', 'manage-campaigns', 'write-copy'],
    };

    for (const [key, caps] of Object.entries(CAPABILITY_MAP)) {
      if (lower.includes(key)) return caps;
    }
    return ['execute-tasks', 'report-results', 'collaborate'];
  }

  /**
   * Infer workflow phases based on workflow name and available agents.
   * @param {string} workflowName
   * @param {string[]} availableAgents
   * @returns {{name: string, agent: string|null, description: string}[]}
   */
  #inferPhases(workflowName, availableAgents) {
    const lower = workflowName.toLowerCase();

    const WORKFLOW_PHASES = {
      'development': [
        { name: 'plan', description: 'Analyze requirements and plan implementation' },
        { name: 'implement', description: 'Write code following the plan' },
        { name: 'review', description: 'Review code for quality and correctness' },
        { name: 'test', description: 'Run tests and validate functionality' },
      ],
      'deploy': [
        { name: 'build', description: 'Build and package the application' },
        { name: 'test', description: 'Run pre-deployment validation' },
        { name: 'stage', description: 'Deploy to staging environment' },
        { name: 'release', description: 'Promote to production' },
      ],
      'review': [
        { name: 'analyze', description: 'Analyze changes and context' },
        { name: 'check-quality', description: 'Run quality and style checks' },
        { name: 'check-security', description: 'Run security analysis' },
        { name: 'report', description: 'Generate review summary' },
      ],
      'onboard': [
        { name: 'setup', description: 'Configure environment and access' },
        { name: 'document', description: 'Generate onboarding documentation' },
        { name: 'verify', description: 'Verify setup and access' },
      ],
      'bug-fix': [
        { name: 'diagnose', description: 'Reproduce and diagnose the issue' },
        { name: 'fix', description: 'Implement the fix' },
        { name: 'test', description: 'Verify the fix with tests' },
        { name: 'document', description: 'Update docs and changelog' },
      ],
      'content': [
        { name: 'research', description: 'Research topic and gather information' },
        { name: 'draft', description: 'Create initial content draft' },
        { name: 'review', description: 'Review and edit content' },
        { name: 'publish', description: 'Format and publish content' },
      ],
    };

    // Find best matching workflow template
    let phases = null;
    for (const [key, template] of Object.entries(WORKFLOW_PHASES)) {
      if (lower.includes(key)) {
        phases = template;
        break;
      }
    }

    if (!phases) {
      phases = [
        { name: 'initialize', description: 'Set up context and inputs' },
        { name: 'execute', description: 'Perform the main task' },
        { name: 'validate', description: 'Validate results' },
        { name: 'finalize', description: 'Clean up and report' },
      ];
    }

    // Assign agents to phases using simple keyword matching
    return phases.map((phase) => {
      let assignedAgent = null;
      const phaseLower = phase.name.toLowerCase();

      for (const agent of availableAgents) {
        const agentLower = agent.toLowerCase();
        if (
          (phaseLower.includes('review') && agentLower.includes('review')) ||
          (phaseLower.includes('test') && (agentLower.includes('qa') || agentLower.includes('test'))) ||
          (phaseLower.includes('implement') && (agentLower.includes('backend') || agentLower.includes('frontend'))) ||
          (phaseLower.includes('document') && (agentLower.includes('doc') || agentLower.includes('writer'))) ||
          (phaseLower.includes('security') && agentLower.includes('security')) ||
          (phaseLower.includes('deploy') && agentLower.includes('devops')) ||
          (phaseLower.includes('build') && agentLower.includes('devops')) ||
          (phaseLower.includes('plan') && (agentLower.includes('architect') || agentLower.includes('pm')))
        ) {
          assignedAgent = agent;
          break;
        }
      }

      return {
        name: phase.name,
        agent: assignedAgent,
        description: phase.description,
      };
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BlueprintEngine, ARCHETYPES, scoreArchetypes, deepMerge, unique, hashId };
export default BlueprintEngine;
