/**
 * @module claude-integration/claude-md-generator
 * @description Generates comprehensive CLAUDE.md files for frameworks produced by ClawOS.
 *
 * The generated CLAUDE.md serves as the primary context document for Claude Code,
 * providing project identity, architecture overview, behavioral rules, file structure,
 * available commands, and domain-specific instructions so that Claude can work
 * effectively within the generated framework.
 *
 * @author ClawOS Framework
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Capitalize the first letter of a string.
 * @param {string} s
 * @returns {string}
 */
function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convert a kebab-case or snake_case string to Title Case.
 * @param {string} s
 * @returns {string}
 */
function toTitleCase(s) {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Indent every line of a multi-line string by a given number of spaces.
 * @param {string} text
 * @param {number} spaces
 * @returns {string}
 */
function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}

// ---------------------------------------------------------------------------
// Domain-specific templates and data
// ---------------------------------------------------------------------------

/**
 * @typedef {import('../blueprint/blueprint-engine.js').RequirementsProfile} RequirementsProfile
 * @typedef {import('../blueprint/blueprint-engine.js').Blueprint} Blueprint
 */

/**
 * ASCII architecture diagrams keyed by archetype.
 * @type {Record<string, string>}
 */
const ARCHITECTURE_DIAGRAMS = {
  api: `
┌─────────────────────────────────────────────────┐
│                   Transport                      │
│              (HTTP / WebSocket)                   │
├─────────────────────────────────────────────────┤
│                   Routing                        │
│            (Route definitions)                   │
├─────────────────────────────────────────────────┤
│                  Middleware                       │
│        (Auth, validation, logging)               │
├─────────────────────────────────────────────────┤
│                 Controllers                      │
│          (Request / Response handling)            │
├─────────────────────────────────────────────────┤
│                  Services                        │
│            (Business logic)                      │
├─────────────────────────────────────────────────┤
│                 Data Layer                        │
│         (Database, ORM, repositories)            │
└─────────────────────────────────────────────────┘`,

  cli: `
┌─────────────────────────────────────────────────┐
│                   Parser                         │
│           (Argument parsing, flags)              │
├─────────────────────────────────────────────────┤
│                  Commands                        │
│          (Command definitions)                   │
├─────────────────────────────────────────────────┤
│                  Services                        │
│            (Business logic)                      │
├─────────────────────────────────────────────────┤
│                   Output                         │
│         (Formatting, colors, tables)             │
└─────────────────────────────────────────────────┘`,

  'ai-agent': `
┌─────────────────────────────────────────────────┐
│                Orchestrator                      │
│          (Agent loop, coordination)              │
├──────────┬──────────────┬───────────────────────┤
│  Planner │    Memory    │      Guardrails       │
│(Strategy)│ (Short/Long) │   (Safety, limits)    │
├──────────┴──────────────┴───────────────────────┤
│                   Tools                          │
│       (External actions, integrations)           │
├─────────────────────────────────────────────────┤
│              Model Adapter                       │
│         (LLM provider abstraction)               │
└─────────────────────────────────────────────────┘`,

  library: `
┌─────────────────────────────────────────────────┐
│               Public API                         │
│          (Exported interfaces)                   │
├─────────────────────────────────────────────────┤
│                  Core                            │
│          (Internal logic)                        │
├──────────┬──────────────────────────────────────┤
│   Utils  │             Types                    │
│(Helpers) │       (Type definitions)             │
└──────────┴──────────────────────────────────────┘`,

  fullstack: `
┌──────────────────────┐  ┌───────────────────────┐
│       Client         │  │        Server         │
│   (UI components,    │  │   (API, middleware,    │
│    routing, state)   │  │    controllers)        │
├──────────────────────┤  ├───────────────────────┤
│                  Shared Layer                    │
│          (Types, utils, constants)               │
├─────────────────────────────────────────────────┤
│                  Database                        │
│          (Migrations, models, seeds)             │
└─────────────────────────────────────────────────┘`,

  microservice: `
┌─────────────────────────────────────────────────┐
│                  Gateway                         │
│         (Ingress, load balancing)                │
├─────────────────────────────────────────────────┤
│                  Service                         │
│            (Business logic)                      │
├─────────────────────────────────────────────────┤
│                 Messaging                        │
│        (Events, queues, pub/sub)                 │
├─────────────────────────────────────────────────┤
│                 Data Layer                        │
│        (Database, cache, storage)                │
└─────────────────────────────────────────────────┘`,

  monorepo: `
┌─────────────────────────────────────────────────┐
│                  Packages                        │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │ pkg-a    │ │ pkg-b    │ │ pkg-c    │       │
│   └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────┤
│                   Shared                         │
│         (Common utils, types, config)            │
├──────────┬──────────────────────────────────────┤
│  Tools   │          Config                      │
│(Scripts) │    (Workspace config)                │
└──────────┴──────────────────────────────────────┘`,

  universal: `
┌─────────────────────────────────────────────────┐
│                   Core                           │
│          (Central logic engine)                  │
├──────────┬──────────────────────────────────────┤
│ Adapters │            Plugins                   │
│(Platform)│      (Extensions)                    │
├──────────┴──────────────────────────────────────┤
│                  Config                          │
│          (Settings, environment)                 │
├─────────────────────────────────────────────────┤
│                  Testing                         │
│        (Unit, integration, e2e)                  │
└─────────────────────────────────────────────────┘`,
};

/**
 * Domain-specific behavioral rules for Claude.
 * @type {Record<string, string[]>}
 */
const DOMAIN_RULES = {
  api: [
    'Always validate request inputs before processing. Use schema validation where available.',
    'Document every endpoint with method, path, request body shape, and response shape.',
    'Keep controllers thin — delegate business logic to the service layer.',
    'Never expose internal error details to API consumers. Use structured error responses.',
    'When adding a new endpoint, also add corresponding integration tests.',
    'Follow RESTful naming conventions: plural nouns for resources, HTTP verbs for actions.',
    'Always include proper HTTP status codes (201 for creation, 204 for deletion, etc.).',
  ],
  cli: [
    'Every command must have a `--help` flag with usage examples.',
    'Validate all user inputs and provide clear error messages with suggested corrections.',
    'Use exit codes consistently: 0 for success, 1 for user error, 2 for system error.',
    'Support both interactive and non-interactive (piped) modes where applicable.',
    'Output structured data (JSON) when `--json` flag is provided.',
    'Add new commands to the help index automatically.',
  ],
  'ai-agent': [
    'All tool calls must include input validation and error handling with retries.',
    'Memory operations must be explicitly logged for observability.',
    'Guardrails must be checked before every external action or tool invocation.',
    'Planning steps should be decomposed into verifiable sub-goals.',
    'Model adapter calls must handle rate limits, timeouts, and provider failover.',
    'Never store raw API keys in memory — use secure config references.',
  ],
  library: [
    'Every public API function must have JSDoc with @param, @returns, and @example.',
    'Avoid breaking changes to the public API — prefer deprecation with migration guides.',
    'Keep the public API surface small; prefer composition over feature flags.',
    'All exports must be tested with both unit and integration tests.',
    'Type definitions must be kept in sync with runtime behavior.',
  ],
  fullstack: [
    'Shared types between client and server must live in the shared/ directory.',
    'Client components should be pure where possible — keep side effects in hooks or services.',
    'Server endpoints must validate all inputs from the client, never trust client data.',
    'Database migrations must be reversible and idempotent.',
    'Use environment variables for all configuration that differs between environments.',
  ],
  microservice: [
    'All inter-service communication must be asynchronous via the messaging layer.',
    'Each service must be independently deployable and testable.',
    'Use correlation IDs for distributed tracing across services.',
    'Event schemas must be versioned — never modify existing event shapes.',
    'Circuit breakers must protect all external service calls.',
  ],
  monorepo: [
    'Shared code belongs in the shared/ package — never duplicate logic across packages.',
    'Each package must have its own package.json, tests, and README.',
    'Cross-package imports must use workspace protocol, not relative paths.',
    'Run affected-only tests and builds in CI, not the full suite.',
    'Version packages independently unless they share a release cycle.',
  ],
  universal: [
    'Core logic must be platform-agnostic — platform specifics go in adapters.',
    'Plugins must follow the documented plugin interface and lifecycle hooks.',
    'Configuration should be layered: defaults < config file < environment < CLI flags.',
    'All adapters must implement the same interface and be swappable at runtime.',
    'Testing must cover core logic, each adapter, and plugin integration points.',
  ],
};

/**
 * Domain-specific documentation instructions.
 * @type {Record<string, string>}
 */
const DOMAIN_DOC_INSTRUCTIONS = {
  api: `### API Documentation Rules
- Every new endpoint must be documented with: HTTP method, path, request body schema, response schema, and example curl command.
- Update the route table in docs/ whenever routes change.
- Error responses must follow the standard error envelope: \`{ "error": { "code": string, "message": string } }\`.
- Include rate limit headers documentation for public endpoints.`,

  cli: `### CLI Documentation Rules
- Every command must include usage synopsis, description, options table, and at least one example.
- Keep the global --help output updated when commands are added or removed.
- Document exit codes and their meanings in the troubleshooting section.`,

  'ai-agent': `### Agent Documentation Rules
- Document each tool with: name, description, input schema, output schema, and failure modes.
- Maintain a decision log format for agent planning steps.
- Document guardrail rules and their triggering conditions.
- Memory schema and retention policies must be documented.`,

  library: `### Library Documentation Rules
- Every public export must have a corresponding entry in the API reference.
- Include "Getting Started" and "Advanced Usage" sections.
- All breaking changes must be documented in CHANGELOG.md with migration instructions.
- Provide runnable code examples for every major feature.`,

  fullstack: `### Full-Stack Documentation Rules
- Document the data flow from UI component through API to database and back.
- Keep the shared type definitions documented with purpose and consumers.
- Document environment variables required for each deployment target.`,

  microservice: `### Microservice Documentation Rules
- Document all published and consumed events with their schemas.
- Maintain a service dependency map.
- Document health check endpoints and their expected responses.
- Include runbook entries for common operational scenarios.`,

  monorepo: `### Monorepo Documentation Rules
- Each package must have its own README with setup and usage instructions.
- Document the dependency graph between packages.
- Maintain a root-level CONTRIBUTING.md with workspace-specific workflow instructions.`,

  universal: `### Framework Documentation Rules
- Document the plugin API with lifecycle hooks and available extension points.
- Maintain adapter compatibility matrix.
- Document configuration schema with defaults and validation rules.`,
};

// ---------------------------------------------------------------------------
// ClaudeMdGenerator class
// ---------------------------------------------------------------------------

/**
 * Generates comprehensive CLAUDE.md files for frameworks produced by ClawOS.
 *
 * The generated document provides Claude Code with all the context it needs to
 * operate effectively within the generated framework: project identity,
 * architecture overview, file structure, behavioral rules, available commands,
 * and domain-specific instructions.
 */
class ClaudeMdGenerator {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate a complete CLAUDE.md document from a requirements profile and
   * a composed blueprint.
   *
   * @param {RequirementsProfile} profile  - The original requirements profile.
   * @param {Blueprint}           blueprint - The composed architecture blueprint.
   * @returns {string} The full CLAUDE.md content as a string.
   */
  generate(profile, blueprint) {
    if (!profile || !profile.name) {
      throw new Error('ClaudeMdGenerator.generate: profile.name is required');
    }
    if (!blueprint || !blueprint.archetype) {
      throw new Error('ClaudeMdGenerator.generate: blueprint.archetype is required');
    }

    const sections = [
      this.generateSection('header', { profile, blueprint }),
      this.generateSection('identity', { profile, blueprint }),
      this.generateSection('architecture', { profile, blueprint }),
      this.generateSection('fileStructure', { profile, blueprint }),
      this.generateSection('modules', { profile, blueprint }),
      this.generateSection('commands', { profile, blueprint }),
      this.generateSection('configuration', { profile, blueprint }),
      this.generateSection('testing', { profile, blueprint }),
      this.generateSection('behavioralRules', { profile, blueprint }),
      this.generateSection('domainInstructions', { profile, blueprint }),
      this.generateSection('fileReadingOrder', { profile, blueprint }),
      this.generateSection('footer', { profile, blueprint }),
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Generate a single named section of the CLAUDE.md document.
   *
   * @param {string} sectionName - One of: header, identity, architecture,
   *   fileStructure, modules, commands, configuration, testing,
   *   behavioralRules, domainInstructions, fileReadingOrder, footer.
   * @param {{ profile: RequirementsProfile, blueprint: Blueprint }} data
   * @returns {string} The rendered section content.
   */
  generateSection(sectionName, data) {
    const { profile, blueprint } = data;

    /** @type {Record<string, () => string>} */
    const generators = {
      header:             () => this.#generateHeader(profile, blueprint),
      identity:           () => this.#generateIdentity(profile, blueprint),
      architecture:       () => this.#generateArchitecture(profile, blueprint),
      fileStructure:      () => this.#generateFileStructure(profile, blueprint),
      modules:            () => this.#generateModules(profile, blueprint),
      commands:           () => this.#generateCommands(profile, blueprint),
      configuration:      () => this.#generateConfiguration(profile, blueprint),
      testing:            () => this.#generateTesting(profile, blueprint),
      behavioralRules:    () => this.#generateBehavioralRules(profile, blueprint),
      domainInstructions: () => this.#generateDomainInstructions(profile, blueprint),
      fileReadingOrder:   () => this.#generateFileReadingOrder(profile, blueprint),
      footer:             () => this.#generateFooter(profile, blueprint),
    };

    const generator = generators[sectionName];
    if (!generator) {
      throw new Error(`ClaudeMdGenerator.generateSection: unknown section "${sectionName}"`);
    }

    return generator();
  }

  /**
   * Get the domain-specific template data for a given domain.
   *
   * Returns the architecture diagram, behavioral rules, and documentation
   * instructions that are specific to the requested domain.
   *
   * @param {string} domain - The framework domain (api, cli, ai-agent, etc.).
   * @returns {{ diagram: string, rules: string[], docInstructions: string }}
   */
  getTemplate(domain) {
    const normalizedDomain = domain.toLowerCase().replace(/\s+/g, '-');

    return {
      diagram: ARCHITECTURE_DIAGRAMS[normalizedDomain] || ARCHITECTURE_DIAGRAMS.universal,
      rules: DOMAIN_RULES[normalizedDomain] || DOMAIN_RULES.universal,
      docInstructions: DOMAIN_DOC_INSTRUCTIONS[normalizedDomain] || DOMAIN_DOC_INSTRUCTIONS.universal,
    };
  }

  // -----------------------------------------------------------------------
  // Private section generators
  // -----------------------------------------------------------------------

  /**
   * Generate the CLAUDE.md header with auto-generation notice.
   * @param {RequirementsProfile} profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateHeader(profile, blueprint) {
    const name = blueprint.name || profile.name;
    return [
      `# CLAUDE.md — ${name}`,
      '',
      '> This file provides context and instructions for Claude Code when working',
      '> within this project. It was auto-generated by the ClawOS meta-framework.',
      '> Modify it freely to refine Claude\'s behavior for your needs.',
    ].join('\n');
  }

  /**
   * Generate the project identity section.
   * @param {RequirementsProfile} profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateIdentity(profile, blueprint) {
    const name = blueprint.name || profile.name;
    const description = blueprint.description || profile.description || `A ${blueprint.archetype} project.`;
    const domain = blueprint.domain || profile.domain || blueprint.archetype;
    const language = profile.language || 'javascript';

    const lines = [
      '## Project Identity',
      '',
      `- **Name:** ${name}`,
      `- **Description:** ${description}`,
      `- **Domain:** ${toTitleCase(domain)}`,
      `- **Architecture:** ${toTitleCase(blueprint.archetype)}`,
      `- **Language:** ${capitalize(language)}`,
      `- **Complexity:** ${capitalize(blueprint.metadata.complexity)}`,
    ];

    if (blueprint.integrations && blueprint.integrations.length > 0) {
      lines.push(`- **Integrations:** ${blueprint.integrations.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate the architecture overview section with ASCII diagram.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateArchitecture(_profile, blueprint) {
    const template = this.getTemplate(blueprint.archetype);
    const layers = blueprint.metadata.layers || [];

    const lines = [
      '## Architecture Overview',
      '',
      `This project follows a **${toTitleCase(blueprint.archetype)}** architecture`,
      `with ${layers.length} distinct layers.`,
      '',
      '### Layer Diagram',
      '',
      '```',
      template.diagram.trim(),
      '```',
      '',
      '### Layers',
      '',
    ];

    for (const layer of layers) {
      lines.push(`- **${toTitleCase(layer)}** — Handles ${layer} concerns`);
    }

    return lines.join('\n');
  }

  /**
   * Generate the file structure section.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateFileStructure(_profile, blueprint) {
    const dirs = blueprint.structure.directories || [];
    const projectName = blueprint.name;

    // Build a simplified tree representation
    const treeLines = [];
    const sortedDirs = [...dirs].sort();

    for (const dir of sortedDirs) {
      // Calculate depth relative to the project root
      const relative = dir.startsWith(projectName + '/')
        ? dir.slice(projectName.length + 1)
        : dir;

      if (relative === projectName || !relative) {
        treeLines.push(`${projectName}/`);
        continue;
      }

      const depth = relative.split('/').length;
      const name = relative.split('/').pop();
      const prefix = '  '.repeat(depth) + '├── ';
      treeLines.push(`${prefix}${name}/`);
    }

    const lines = [
      '## File Structure',
      '',
      '```',
      ...treeLines,
      '```',
      '',
      `**Estimated files:** ${blueprint.metadata.estimatedFiles}`,
    ];

    return lines.join('\n');
  }

  /**
   * Generate the key modules section.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateModules(_profile, blueprint) {
    const modules = blueprint.modules || [];

    if (modules.length === 0) {
      return '';
    }

    const lines = [
      '## Key Modules',
      '',
      '| Module | Path | Responsibility | Exports |',
      '|--------|------|----------------|---------|',
    ];

    for (const mod of modules) {
      const exports = mod.exports.map((e) => `\`${e}\``).join(', ');
      lines.push(
        `| **${toTitleCase(mod.name)}** | \`${mod.path}\` | ${mod.responsibility} | ${exports} |`,
      );
    }

    // Add dependency information
    const modulesWithDeps = modules.filter((m) => m.dependencies.length > 0);
    if (modulesWithDeps.length > 0) {
      lines.push('');
      lines.push('### Module Dependencies');
      lines.push('');
      for (const mod of modulesWithDeps) {
        lines.push(`- **${toTitleCase(mod.name)}** depends on: ${mod.dependencies.map((d) => `\`${d}\``).join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate the available commands section.
   * @param {RequirementsProfile} profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateCommands(profile, blueprint) {
    const name = (profile.name || blueprint.name).toLowerCase().replace(/\s+/g, '-');
    const domain = (blueprint.domain || blueprint.archetype).toLowerCase();

    const lines = [
      '## Available Slash Commands',
      '',
      'Use these Claude Code slash commands to perform common tasks:',
      '',
      '| Command | Description |',
      '|---------|-------------|',
      `| \`/${name}:help\` | Show framework help and available commands |`,
      `| \`/${name}:status\` | Show project status and health |`,
      `| \`/${name}:test\` | Run tests with guidance |`,
    ];

    /** @type {Record<string, [string, string][]>} */
    const domainCommands = {
      api: [
        [`/${name}:endpoint`, 'Create a new API endpoint'],
        [`/${name}:middleware`, 'Add middleware to the pipeline'],
        [`/${name}:migrate`, 'Create or run a database migration'],
      ],
      cli: [
        [`/${name}:command`, 'Add a new CLI command'],
        [`/${name}:plugin`, 'Add a plugin to the CLI'],
      ],
      testing: [
        [`/${name}:suite`, 'Create a new test suite'],
        [`/${name}:mock`, 'Create a mock or fixture'],
      ],
      ui: [
        [`/${name}:component`, 'Create a new UI component'],
        [`/${name}:page`, 'Create a new page / route'],
      ],
      'ai-agent': [
        [`/${name}:agent`, 'Create a new agent definition'],
        [`/${name}:tool`, 'Create a new tool for the agent'],
      ],
      automation: [
        [`/${name}:workflow`, 'Create a new automation workflow'],
        [`/${name}:task`, 'Create a new task definition'],
      ],
      data: [
        [`/${name}:pipeline`, 'Create a new data pipeline'],
        [`/${name}:transform`, 'Create a data transformation step'],
      ],
      plugin: [
        [`/${name}:extension`, 'Create a new extension module'],
        [`/${name}:hook`, 'Create a new lifecycle hook'],
      ],
    };

    const commands = domainCommands[domain] || [];
    for (const [cmd, desc] of commands) {
      lines.push(`| \`${cmd}\` | ${desc} |`);
    }

    return lines.join('\n');
  }

  /**
   * Generate the configuration documentation section.
   * @param {RequirementsProfile} profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateConfiguration(profile, blueprint) {
    const configFormat = blueprint.config.format || profile.configFormat || 'json';
    const configFiles = blueprint.config.files || [];

    const lines = [
      '## Configuration',
      '',
      `Configuration format: **${configFormat.toUpperCase()}**`,
      '',
    ];

    if (configFiles.length > 0) {
      lines.push('### Configuration Files');
      lines.push('');
      for (const file of configFiles) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }

    lines.push(
      '### Environment Variables',
      '',
      'Environment-specific settings override config file values. Define them in',
      'a `.env` file (not committed) or in your deployment environment.',
      '',
      '| Variable | Description | Default |',
      '|----------|-------------|---------|',
      '| `NODE_ENV` | Runtime environment | `development` |',
      '| `LOG_LEVEL` | Logging verbosity | `info` |',
      '| `PORT` | Server port (if applicable) | `3000` |',
    );

    return lines.join('\n');
  }

  /**
   * Generate the testing instructions section.
   * @param {RequirementsProfile} profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateTesting(profile, blueprint) {
    const hasTesting = profile.testing !== false;

    if (!hasTesting) {
      return [
        '## Testing',
        '',
        'Testing scaffolding was not included in this project. To add tests:',
        '',
        '1. Create a `tests/` directory',
        '2. Add a test runner (e.g., `vitest`, `jest`, or Node.js built-in `--test`)',
        '3. Write unit tests for each module in `tests/unit/`',
        '4. Write integration tests in `tests/integration/`',
      ].join('\n');
    }

    return [
      '## Testing',
      '',
      '### Running Tests',
      '',
      '```bash',
      '# Run all tests',
      'npm test',
      '',
      '# Run unit tests only',
      'npm run test:unit',
      '',
      '# Run integration tests only',
      'npm run test:integration',
      '',
      '# Run tests in watch mode',
      'npm run test:watch',
      '',
      '# Run tests with coverage',
      'npm run test:coverage',
      '```',
      '',
      '### Test Structure',
      '',
      '- `tests/unit/` — Unit tests for individual modules and functions',
      '- `tests/integration/` — Integration tests for module interactions',
      '- `tests/setup.js` — Global test setup and shared fixtures',
      '',
      '### Writing Tests',
      '',
      '- Place unit tests next to the module they test or under `tests/unit/`.',
      '- Name test files with the `.test.js` suffix.',
      '- Each test file should test one module. Group related assertions with `describe`.',
      '- Use the setup file for shared mocks and environment configuration.',
      '- Aim for >80% code coverage on core business logic.',
    ].join('\n');
  }

  /**
   * Generate the behavioral rules section.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateBehavioralRules(_profile, blueprint) {
    const domain = (blueprint.domain || blueprint.archetype).toLowerCase();
    const template = this.getTemplate(domain);
    const rules = template.rules;

    const lines = [
      '## Behavioral Rules for Claude',
      '',
      'When working in this project, Claude should follow these rules:',
      '',
      '### General Rules',
      '',
      '1. **Read before writing.** Always read existing files before modifying them to understand context and conventions.',
      '2. **Follow existing patterns.** Match the coding style, naming conventions, and architecture patterns already in use.',
      '3. **Test your changes.** Run the test suite after making changes. If tests fail, fix them before moving on.',
      '4. **One thing at a time.** Make focused, single-purpose changes. Avoid large refactors unless explicitly requested.',
      '5. **Preserve backwards compatibility.** Do not break existing public APIs or interfaces without explicit approval.',
      '6. **Document intent.** Add JSDoc comments to new functions and update existing docs when behavior changes.',
      '7. **Handle errors gracefully.** Use proper error types, include context in error messages, and never swallow errors silently.',
      '8. **No hardcoded secrets.** Never commit API keys, passwords, or tokens. Use environment variables or config references.',
    ];

    if (rules.length > 0) {
      lines.push('');
      lines.push(`### ${toTitleCase(domain)}-Specific Rules`);
      lines.push('');
      for (let i = 0; i < rules.length; i++) {
        lines.push(`${i + 1}. ${rules[i]}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate domain-specific instructions section.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateDomainInstructions(_profile, blueprint) {
    const domain = (blueprint.domain || blueprint.archetype).toLowerCase();
    const template = this.getTemplate(domain);

    if (!template.docInstructions) {
      return '';
    }

    return [
      '## Domain-Specific Instructions',
      '',
      template.docInstructions,
    ].join('\n');
  }

  /**
   * Generate the file reading order section.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} blueprint
   * @returns {string}
   */
  #generateFileReadingOrder(_profile, blueprint) {
    const projectName = blueprint.name;
    const layers = blueprint.metadata.layers || [];
    const hasClaudeIntegration = blueprint.integrations.includes('claude-code');

    const lines = [
      '## File Reading Order',
      '',
      'When familiarizing yourself with this project, read files in this order:',
      '',
      `1. \`CLAUDE.md\` (this file) — Project context and rules`,
      `2. \`${projectName}/package.json\` — Dependencies and scripts`,
      `3. \`${projectName}/README.md\` — User-facing documentation`,
      `4. \`${projectName}/src/index.js\` — Application entry point`,
    ];

    let order = 5;

    // Add layer entry points
    for (const layer of layers) {
      lines.push(`${order}. \`${projectName}/src/${layer}/index.js\` — ${toTitleCase(layer)} layer entry`);
      order++;
    }

    // Config
    if (blueprint.config.files.length > 0) {
      lines.push(`${order}. \`${blueprint.config.files[0]}\` — Default configuration`);
      order++;
    }

    // Claude settings
    if (hasClaudeIntegration) {
      lines.push(`${order}. \`${projectName}/.claude/settings.json\` — Claude Code settings`);
      order++;
    }

    return lines.join('\n');
  }

  /**
   * Generate the footer section.
   * @param {RequirementsProfile} _profile
   * @param {Blueprint} _blueprint
   * @returns {string}
   */
  #generateFooter(_profile, _blueprint) {
    return [
      '---',
      '',
      '*Generated by [ClawOS](https://github.com/clawos) meta-framework.*',
      '*Edit this file to customize Claude\'s behavior for your project.*',
    ].join('\n');
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { ClaudeMdGenerator, ARCHITECTURE_DIAGRAMS, DOMAIN_RULES, DOMAIN_DOC_INSTRUCTIONS };
export default ClaudeMdGenerator;
