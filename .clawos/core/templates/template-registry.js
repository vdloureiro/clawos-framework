/**
 * @module TemplateRegistry
 * @description Registry of available templates organized by category for the
 * ClawOS meta-framework. Ships with 17 production-quality templates covering
 * modules, configs, tests, docs, CI, and more.
 *
 * @author ClawOS Framework
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Template data model
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TemplateEntry
 * @property {string} id           — unique identifier (kebab-case)
 * @property {string} name         — human-readable display name
 * @property {string} category     — one of: module, config, test, doc, ci, claude, entrypoint
 * @property {string} description  — what this template generates
 * @property {string} language     — primary language / format (js, ts, py, json, yaml, md, docker, etc.)
 * @property {string} template     — the template source string
 * @property {string[]} requiredVars — variables the template needs at render time
 */

// ---------------------------------------------------------------------------
// TemplateRegistry class
// ---------------------------------------------------------------------------

/**
 * @class TemplateRegistry
 * @description Stores and retrieves template definitions indexed by id,
 * category, and language. Pre-loaded with essential templates for quick
 * framework generation.
 */
class TemplateRegistry {
  /** @type {Map<string, TemplateEntry>} */
  #templates = new Map();

  constructor() {
    this.#loadBuiltins();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Register a new template (or overwrite an existing one by id).
   * @param {TemplateEntry} template
   * @returns {void}
   */
  register(template) {
    this.#validate(template);
    this.#templates.set(template.id, { ...template });
  }

  /**
   * Retrieve a template by its unique id.
   * @param {string} id
   * @returns {TemplateEntry | undefined}
   */
  getById(id) {
    return this.#templates.get(id);
  }

  /**
   * Retrieve all templates that belong to a given category.
   * @param {string} category
   * @returns {TemplateEntry[]}
   */
  getByCategory(category) {
    const results = [];
    for (const tpl of this.#templates.values()) {
      if (tpl.category === category) results.push(tpl);
    }
    return results;
  }

  /**
   * Retrieve all templates that target a given language / format.
   * @param {string} language
   * @returns {TemplateEntry[]}
   */
  getByLanguage(language) {
    const results = [];
    for (const tpl of this.#templates.values()) {
      if (tpl.language === language) results.push(tpl);
    }
    return results;
  }

  /**
   * Return every registered template.
   * @returns {TemplateEntry[]}
   */
  getAll() {
    return [...this.#templates.values()];
  }

  /**
   * Full-text search across id, name, description, and category.
   * Case-insensitive. Returns templates whose metadata contains the query.
   * @param {string} query
   * @returns {TemplateEntry[]}
   */
  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const tpl of this.#templates.values()) {
      const haystack = `${tpl.id} ${tpl.name} ${tpl.description} ${tpl.category} ${tpl.language}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push(tpl);
      }
    }
    return results;
  }

  /**
   * Return the total number of registered templates.
   * @returns {number}
   */
  get size() {
    return this.#templates.size;
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  /**
   * @param {TemplateEntry} t
   */
  #validate(t) {
    if (!t || typeof t !== 'object') {
      throw new TypeError('Template must be a non-null object');
    }
    const required = ['id', 'name', 'category', 'description', 'language', 'template'];
    for (const key of required) {
      if (typeof t[key] !== 'string' || t[key].length === 0) {
        throw new TypeError(`Template.${key} must be a non-empty string`);
      }
    }
    const validCategories = ['module', 'config', 'test', 'doc', 'ci', 'claude', 'entrypoint'];
    if (!validCategories.includes(t.category)) {
      throw new TypeError(`Template.category must be one of: ${validCategories.join(', ')}`);
    }
    if (!Array.isArray(t.requiredVars)) {
      throw new TypeError('Template.requiredVars must be an array');
    }
  }

  // -----------------------------------------------------------------------
  // Built-in templates
  // -----------------------------------------------------------------------

  /** @private */
  #loadBuiltins() {
    const builtins = [
      // ------------------------------------------------------------------ 1
      {
        id: 'module-js',
        name: 'JavaScript ES Module',
        category: 'module',
        description: 'JavaScript ES module boilerplate with JSDoc, exports, and error handling',
        language: 'js',
        requiredVars: ['moduleName', 'description'],
        template: `/**
 * @module {{moduleName | pascalCase}}
 * @description {{description}}
 *{{#if author}}
 * @author {{author}}{{/if}}
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_NAME = '{{moduleName}}';

// ---------------------------------------------------------------------------
// Core implementation
// ---------------------------------------------------------------------------

/**
 * {{description}}
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} Module interface
 */
export function create{{moduleName | pascalCase}}(options = {}) {
  const config = {
    debug: false,
    ...options,
  };

  /**
   * Initialize the module.
   * @returns {Promise<void>}
   */
  async function init() {
    if (config.debug) {
      console.log(\`[\${MODULE_NAME}] initializing...\`);
    }
  }

  /**
   * Shut down and release resources.
   * @returns {Promise<void>}
   */
  async function destroy() {
    if (config.debug) {
      console.log(\`[\${MODULE_NAME}] shutting down...\`);
    }
  }

  return {
    init,
    destroy,
  };
}

export default create{{moduleName | pascalCase}};
`,
      },
      // ------------------------------------------------------------------ 2
      {
        id: 'module-ts',
        name: 'TypeScript Module',
        category: 'module',
        description: 'TypeScript module boilerplate with interfaces, generics, and strict typing',
        language: 'ts',
        requiredVars: ['moduleName', 'description'],
        template: `/**
 * @module {{moduleName | pascalCase}}
 * @description {{description}}
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface {{moduleName | pascalCase}}Options {
  /** Enable debug logging */
  debug?: boolean;
  /** Module-specific configuration */
  config?: Record<string, unknown>;
}

export interface {{moduleName | pascalCase}}Instance {
  /** Initialize the module */
  init(): Promise<void>;
  /** Shut down and release resources */
  destroy(): Promise<void>;
  /** Check whether the module is ready */
  isReady(): boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_NAME = '{{moduleName}}';

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Create a new {{moduleName | pascalCase}} instance.
 */
export function create{{moduleName | pascalCase}}(
  options: {{moduleName | pascalCase}}Options = {},
): {{moduleName | pascalCase}}Instance {
  const config: Required<{{moduleName | pascalCase}}Options> = {
    debug: false,
    config: {},
    ...options,
  };

  let ready = false;

  async function init(): Promise<void> {
    if (config.debug) {
      console.log(\`[\${MODULE_NAME}] initializing...\`);
    }
    ready = true;
  }

  async function destroy(): Promise<void> {
    if (config.debug) {
      console.log(\`[\${MODULE_NAME}] shutting down...\`);
    }
    ready = false;
  }

  function isReady(): boolean {
    return ready;
  }

  return { init, destroy, isReady };
}

export default create{{moduleName | pascalCase}};
`,
      },
      // ------------------------------------------------------------------ 3
      {
        id: 'module-py',
        name: 'Python Module',
        category: 'module',
        description: 'Python module boilerplate with type hints, dataclass config, and logging',
        language: 'py',
        requiredVars: ['moduleName', 'description'],
        template: `"""
{{moduleName | pascalCase}} - {{description}}
{{#if author}}
Author: {{author}}{{/if}}
License: MIT
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger("{{moduleName | snakeCase}}")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class {{moduleName | pascalCase}}Config:
    """Configuration for {{moduleName | pascalCase}}."""

    debug: bool = False
    options: dict[str, Any] = field(default_factory=dict)

# ---------------------------------------------------------------------------
# Core class
# ---------------------------------------------------------------------------

class {{moduleName | pascalCase}}:
    """{{description}}"""

    def __init__(self, config: Optional[{{moduleName | pascalCase}}Config] = None) -> None:
        self._config = config or {{moduleName | pascalCase}}Config()
        self._ready = False

    async def init(self) -> None:
        """Initialize the module."""
        if self._config.debug:
            logger.debug("Initializing {{moduleName | pascalCase}}...")
        self._ready = True

    async def destroy(self) -> None:
        """Shut down and release resources."""
        if self._config.debug:
            logger.debug("Shutting down {{moduleName | pascalCase}}...")
        self._ready = False

    @property
    def is_ready(self) -> bool:
        """Check whether the module is ready."""
        return self._ready

    def __repr__(self) -> str:
        return f"{{moduleName | pascalCase}}(ready={self._ready})"


def create_{{moduleName | snakeCase}}(
    config: Optional[{{moduleName | pascalCase}}Config] = None,
) -> {{moduleName | pascalCase}}:
    """Factory function for {{moduleName | pascalCase}}."""
    return {{moduleName | pascalCase}}(config)
`,
      },
      // ------------------------------------------------------------------ 4
      {
        id: 'class-js',
        name: 'JavaScript Class',
        category: 'module',
        description: 'JavaScript class definition with constructor, methods, and JSDoc',
        language: 'js',
        requiredVars: ['className', 'description'],
        template: `/**
 * @class {{className | pascalCase}}
 * @description {{description}}
 */
class {{className | pascalCase}} {
  /**
   * Create a new {{className | pascalCase}} instance.
   * @param {Object} [options={}]
{{#each properties}}
   * @param {*} options.{{.}} — {{.}}
{{/each}}
   */
  constructor(options = {}) {
{{#each properties}}
    /** @type {*} */
    this.{{.}} = options.{{.}} ?? null;
{{/each}}
{{#unless properties}}
    /** @type {Object} */
    this.options = { ...options };
{{/unless}}
  }

  /**
   * Initialize the instance.
   * @returns {Promise<{{className | pascalCase}}>} this (for chaining)
   */
  async init() {
    return this;
  }

  /**
   * Serialize to a plain object.
   * @returns {Object}
   */
  toJSON() {
    return {
{{#each properties}}
      {{.}}: this.{{.}},
{{/each}}
    };
  }

  /**
   * Human-readable representation.
   * @returns {string}
   */
  toString() {
    return \`{{className | pascalCase}} {\${JSON.stringify(this.toJSON(), null, 2)}}\`;
  }
}

export default {{className | pascalCase}};
export { {{className | pascalCase}} };
`,
      },
      // ------------------------------------------------------------------ 5
      {
        id: 'class-ts',
        name: 'TypeScript Class with Interface',
        category: 'module',
        description: 'TypeScript class with a companion interface, generics support, and strict types',
        language: 'ts',
        requiredVars: ['className', 'description'],
        template: `/**
 * @module {{className | pascalCase}}
 * @description {{description}}
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface I{{className | pascalCase}} {
{{#each properties}}
  {{.}}: unknown;
{{/each}}
{{#unless properties}}
  [key: string]: unknown;
{{/unless}}
  init(): Promise<void>;
  toJSON(): Record<string, unknown>;
}

export interface {{className | pascalCase}}Options {
{{#each properties}}
  {{.}}?: unknown;
{{/each}}
{{#unless properties}}
  [key: string]: unknown;
{{/unless}}
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class {{className | pascalCase}} implements I{{className | pascalCase}} {
{{#each properties}}
  public {{.}}: unknown;
{{/each}}

  constructor(options: {{className | pascalCase}}Options = {}) {
{{#each properties}}
    this.{{.}} = options.{{.}} ?? null;
{{/each}}
  }

  async init(): Promise<void> {
    // initialization logic
  }

  toJSON(): Record<string, unknown> {
    return {
{{#each properties}}
      {{.}}: this.{{.}},
{{/each}}
    };
  }

  toString(): string {
    return \`{{className | pascalCase}} \${JSON.stringify(this.toJSON(), null, 2)}\`;
  }
}

export default {{className | pascalCase}};
`,
      },
      // ------------------------------------------------------------------ 6
      {
        id: 'entrypoint-js',
        name: 'JavaScript Entry Point',
        category: 'entrypoint',
        description: 'Main index.js entry point with CLI argument parsing and graceful shutdown',
        language: 'js',
        requiredVars: ['projectName', 'description'],
        template: `#!/usr/bin/env node

/**
 * {{projectName}} — {{description}}
 *
 * @module main
 * @license MIT
 */

import { parseArgs } from 'node:util';
import process from 'node:process';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const { values: flags } = parseArgs({
  options: {
    help:    { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    debug:   { type: 'boolean', short: 'd', default: false },
{{#if configFlag}}
    config:  { type: 'string',  short: 'c', default: '' },
{{/if}}
  },
  strict: false,
  allowPositionals: true,
});

// ---------------------------------------------------------------------------
// Version / Help
// ---------------------------------------------------------------------------

const VERSION = '{{version}}';

if (flags.version) {
  console.log(\`{{projectName}} v\${VERSION}\`);
  process.exit(0);
}

if (flags.help) {
  console.log(\`
Usage: {{projectName | kebabCase}} [options]

{{description}}

Options:
  -h, --help      Show this help message
  -v, --version   Print version
  -d, --debug     Enable debug output
{{#if configFlag}}
  -c, --config    Path to config file
{{/if}}
\`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (flags.debug) {
    console.log('[debug] starting {{projectName}}...');
  }

  // --- application logic goes here ---
  console.log('{{projectName}} is running.');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = async (signal) => {
  console.log(\`\\nReceived \${signal}. Shutting down gracefully...\`);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled rejection:', reason);
  process.exit(1);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
      },
      // ------------------------------------------------------------------ 7
      {
        id: 'entrypoint-ts',
        name: 'TypeScript Entry Point',
        category: 'entrypoint',
        description: 'TypeScript main entry point with type-safe CLI parsing and shutdown hooks',
        language: 'ts',
        requiredVars: ['projectName', 'description'],
        template: `#!/usr/bin/env tsx

/**
 * {{projectName}} — {{description}}
 *
 * @module main
 * @license MIT
 */

import { parseArgs } from 'node:util';
import process from 'node:process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CLIFlags {
  help: boolean;
  version: boolean;
  debug: boolean;
{{#if configFlag}}
  config: string;
{{/if}}
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    help:    { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    debug:   { type: 'boolean', short: 'd', default: false },
{{#if configFlag}}
    config:  { type: 'string',  short: 'c', default: '' },
{{/if}}
  },
  strict: false,
  allowPositionals: true,
});

const flags = values as unknown as CLIFlags;

// ---------------------------------------------------------------------------
// Version / Help
// ---------------------------------------------------------------------------

const VERSION = '{{version}}';

if (flags.version) {
  console.log(\`{{projectName}} v\${VERSION}\`);
  process.exit(0);
}

if (flags.help) {
  console.log(\`
Usage: {{projectName | kebabCase}} [options]

{{description}}

Options:
  -h, --help      Show this help message
  -v, --version   Print version
  -d, --debug     Enable debug output
{{#if configFlag}}
  -c, --config    Path to config file
{{/if}}
\`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (flags.debug) {
    console.log('[debug] starting {{projectName}}...');
  }

  // --- application logic goes here ---
  console.log('{{projectName}} is running.');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = async (signal: string): Promise<void> => {
  console.log(\`\\nReceived \${signal}. Shutting down gracefully...\`);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err: Error) => {
  console.error('[fatal] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[fatal] Unhandled rejection:', reason);
  process.exit(1);
});

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
`,
      },
      // ------------------------------------------------------------------ 8
      {
        id: 'test-js',
        name: 'JavaScript Test File',
        category: 'test',
        description: 'JavaScript test file using the built-in node:test runner with describe/it blocks',
        language: 'js',
        requiredVars: ['moduleName'],
        template: `/**
 * Tests for {{moduleName | pascalCase}}
 *
 * Run: node --test {{moduleName | kebabCase}}.test.js
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
{{#if importPath}}
import { create{{moduleName | pascalCase}} } from '{{importPath}}';
{{/if}}
{{#unless importPath}}
import { create{{moduleName | pascalCase}} } from './{{moduleName | kebabCase}}.js';
{{/unless}}

describe('{{moduleName | pascalCase}}', () => {
  let instance;

  before(() => {
    // one-time setup
  });

  after(() => {
    // one-time teardown
  });

  beforeEach(() => {
    instance = create{{moduleName | pascalCase}}();
  });

  afterEach(() => {
    instance = null;
  });

  describe('creation', () => {
    it('should create an instance with default options', () => {
      assert.ok(instance, 'instance should be defined');
    });

    it('should accept custom options', () => {
      const custom = create{{moduleName | pascalCase}}({ debug: true });
      assert.ok(custom, 'custom instance should be defined');
    });
  });

  describe('init / destroy lifecycle', () => {
    it('should initialize without errors', async () => {
      await assert.doesNotReject(() => instance.init());
    });

    it('should shut down without errors', async () => {
      await instance.init();
      await assert.doesNotReject(() => instance.destroy());
    });
  });

  describe('edge cases', () => {
    it('should handle being called with no arguments', () => {
      const empty = create{{moduleName | pascalCase}}();
      assert.ok(empty);
    });

    it('should handle null options gracefully', () => {
      assert.doesNotThrow(() => create{{moduleName | pascalCase}}({}));
    });
  });
});
`,
      },
      // ------------------------------------------------------------------ 9
      {
        id: 'test-ts',
        name: 'TypeScript Test File (Vitest)',
        category: 'test',
        description: 'TypeScript test file using Vitest with describe/it/expect',
        language: 'ts',
        requiredVars: ['moduleName'],
        template: `/**
 * Tests for {{moduleName | pascalCase}}
 *
 * Run: npx vitest run {{moduleName | kebabCase}}.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
{{#if importPath}}
import { create{{moduleName | pascalCase}} } from '{{importPath}}';
{{/if}}
{{#unless importPath}}
import { create{{moduleName | pascalCase}} } from './{{moduleName | kebabCase}}';
{{/unless}}

describe('{{moduleName | pascalCase}}', () => {
  let instance: ReturnType<typeof create{{moduleName | pascalCase}}>;

  beforeAll(() => {
    // one-time setup
  });

  afterAll(() => {
    // one-time teardown
  });

  beforeEach(() => {
    instance = create{{moduleName | pascalCase}}();
  });

  afterEach(() => {
    instance = undefined!;
  });

  describe('creation', () => {
    it('should create an instance with default options', () => {
      expect(instance).toBeDefined();
    });

    it('should accept custom options', () => {
      const custom = create{{moduleName | pascalCase}}({ debug: true });
      expect(custom).toBeDefined();
    });
  });

  describe('init / destroy lifecycle', () => {
    it('should initialize without errors', async () => {
      await expect(instance.init()).resolves.not.toThrow();
    });

    it('should shut down without errors', async () => {
      await instance.init();
      await expect(instance.destroy()).resolves.not.toThrow();
    });
  });

  describe('isReady', () => {
    it('should be false before init', () => {
      expect(instance.isReady()).toBe(false);
    });

    it('should be true after init', async () => {
      await instance.init();
      expect(instance.isReady()).toBe(true);
    });

    it('should be false after destroy', async () => {
      await instance.init();
      await instance.destroy();
      expect(instance.isReady()).toBe(false);
    });
  });
});
`,
      },
      // ----------------------------------------------------------------- 10
      {
        id: 'package-json',
        name: 'package.json',
        category: 'config',
        description: 'Node.js package.json template with scripts, exports, and metadata',
        language: 'json',
        requiredVars: ['projectName', 'description'],
        template: `{
  "name": "{{projectName | kebabCase}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".": {
      "import": "./src/index.js"
    }
  },
  "bin": {
{{#if binName}}
    "{{binName | kebabCase}}": "./src/index.js"
{{/if}}
  },
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "node --test 'src/**/*.test.js'",
    "lint": "eslint src/",
    "format": "prettier --write 'src/**/*.{js,json,md}'"
  },
  "keywords": [{{#each keywords}}"{{.}}"{{#unless @last}}, {{/unless}}{{/each}}],
  "author": "{{author}}",
  "license": "{{license}}",
  "engines": {
    "node": ">=20.0.0"
  },
  "files": [
    "src/",
    "README.md",
    "LICENSE"
  ]
}
`,
      },
      // ----------------------------------------------------------------- 11
      {
        id: 'readme',
        name: 'README.md',
        category: 'doc',
        description: 'Comprehensive README.md template with badges, install, usage, and API sections',
        language: 'md',
        requiredVars: ['projectName', 'description'],
        template: `# {{projectName}}

{{description}}

{{#if badges}}
{{#each badges}}
![{{name}}]({{url}})
{{/each}}
{{/if}}

## Features

{{#each features}}
- {{.}}
{{/each}}
{{#unless features}}
- Feature 1
- Feature 2
{{/unless}}

## Requirements

- Node.js >= 20.0.0
{{#each requirements}}
- {{.}}
{{/each}}

## Installation

\`\`\`bash
npm install {{projectName | kebabCase}}
\`\`\`

## Quick Start

\`\`\`js
import { create{{projectName | pascalCase}} } from '{{projectName | kebabCase}}';

const instance = create{{projectName | pascalCase}}();
await instance.init();
\`\`\`

## Usage

{{#if usageExample}}
\`\`\`js
{{usageExample}}
\`\`\`
{{/if}}
{{#unless usageExample}}
See the [examples](./examples) directory for detailed usage patterns.
{{/unless}}

## API Reference

### \`create{{projectName | pascalCase}}(options?)\`

Create a new instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`debug\` | \`boolean\` | \`false\` | Enable debug logging |

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/my-feature\`)
3. Commit your changes (\`git commit -am 'Add my feature'\`)
4. Push to the branch (\`git push origin feature/my-feature\`)
5. Open a Pull Request

## License

{{#if license}}
{{license}}
{{/if}}
{{#unless license}}
MIT
{{/unless}}
`,
      },
      // ----------------------------------------------------------------- 12
      {
        id: 'claude-md',
        name: 'CLAUDE.md',
        category: 'claude',
        description: 'CLAUDE.md configuration file for Claude Code AI assistant context',
        language: 'md',
        requiredVars: ['projectName', 'description'],
        template: `# CLAUDE.md — {{projectName}}

{{description}}

## Project Overview

This is **{{projectName}}**, a {{projectType}} project.

## Tech Stack

{{#each techStack}}
- {{.}}
{{/each}}
{{#unless techStack}}
- Node.js (ES modules)
- No external runtime dependencies
{{/unless}}

## Architecture

{{#if architecture}}
{{architecture}}
{{/if}}
{{#unless architecture}}
\`\`\`
src/
  index.js          — entry point
  core/             — core modules
  utils/            — utility functions
  config/           — configuration
\`\`\`
{{/unless}}

## Key Commands

\`\`\`bash
# Development
npm run dev          # start with file watching
npm start            # production start

# Testing
npm test             # run all tests

# Linting
npm run lint         # run ESLint
npm run format       # run Prettier
\`\`\`

## Code Conventions

- ES module syntax (\`import\`/\`export\`)
- No external dependencies unless strictly necessary
- JSDoc on all public APIs
- Descriptive variable and function names
- Error handling: always catch and wrap with context

## Important Patterns

{{#each patterns}}
- {{.}}
{{/each}}
{{#unless patterns}}
- Factory functions over classes where possible
- Async/await over raw Promises
- Fail fast with descriptive errors
{{/unless}}

## Common Pitfalls

{{#each pitfalls}}
- {{.}}
{{/each}}
{{#unless pitfalls}}
- Remember to call \`.init()\` before using module instances
- All file paths should be absolute or resolved via \`import.meta.url\`
{{/unless}}
`,
      },
      // ----------------------------------------------------------------- 13
      {
        id: 'dockerfile',
        name: 'Dockerfile',
        category: 'ci',
        description: 'Multi-stage Dockerfile for Node.js applications with security best practices',
        language: 'docker',
        requiredVars: ['projectName'],
        template: `# ----- Stage 1: Build -----
FROM node:{{nodeVersion}}-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

{{#if buildStep}}
RUN {{buildStep}}
{{/if}}

# Prune dev dependencies
RUN npm prune --production

# ----- Stage 2: Runtime -----
FROM node:{{nodeVersion}}-alpine AS runtime

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production artifacts
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/src ./src
{{#if buildStep}}
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
{{/if}}

USER appuser

ENV NODE_ENV=production
{{#if port}}
EXPOSE {{port}}
{{/if}}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \\
  CMD node -e "process.exit(0)"

CMD ["node", "{{#if entryFile}}{{entryFile}}{{/if}}{{#unless entryFile}}src/index.js{{/unless}}"]
`,
      },
      // ----------------------------------------------------------------- 14
      {
        id: 'github-action',
        name: 'GitHub Actions CI',
        category: 'ci',
        description: 'GitHub Actions workflow for CI with testing, linting, and optional publishing',
        language: 'yaml',
        requiredVars: ['projectName'],
        template: `name: CI — {{projectName}}

on:
  push:
    branches: [main{{#if devBranch}}, {{devBranch}}{{/if}}]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    name: Test (Node $\\{{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [{{#if nodeVersions}}{{#each nodeVersions}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}{{#unless nodeVersions}}20, 22{{/unless}}]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js $\\{{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: $\\{{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Test
        run: npm test

{{#if publishToNpm}}
  publish:
    name: Publish to npm
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - run: npm ci
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: $\\{{ secrets.NPM_TOKEN }}
{{/if}}
`,
      },
      // ----------------------------------------------------------------- 15
      {
        id: 'gitignore',
        name: '.gitignore',
        category: 'config',
        description: 'Comprehensive .gitignore for Node.js / TypeScript projects',
        language: 'gitignore',
        requiredVars: [],
        template: `# --- Dependencies ---
node_modules/
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# --- Build outputs ---
dist/
build/
out/
*.tsbuildinfo

# --- Environment ---
.env
.env.local
.env.*.local

# --- Logs ---
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# --- OS files ---
.DS_Store
Thumbs.db
desktop.ini

# --- IDE ---
.vscode/
!.vscode/settings.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# --- Test / Coverage ---
coverage/
.nyc_output/
*.lcov

# --- Misc ---
.cache/
tmp/
temp/
{{#each extraIgnores}}
{{.}}
{{/each}}
`,
      },
      // ----------------------------------------------------------------- 16
      {
        id: 'eslint-config',
        name: 'ESLint Config',
        category: 'config',
        description: 'ESLint flat config for modern JavaScript / TypeScript projects',
        language: 'js',
        requiredVars: [],
        template: `import js from '@eslint/js';
{{#if typescript}}
import tseslint from 'typescript-eslint';
{{/if}}

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
{{#if typescript}}
  ...tseslint.configs.recommended,
{{/if}}
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
{{#each extraRules}}
      '{{@key}}': {{.}},
{{/each}}
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/'],
  },
];
`,
      },
      // ----------------------------------------------------------------- 17
      {
        id: 'tsconfig',
        name: 'tsconfig.json',
        category: 'config',
        description: 'TypeScript configuration with strict mode and modern module resolution',
        language: 'json',
        requiredVars: [],
        template: `{
  "compilerOptions": {
    "target": "{{#if target}}{{target}}{{/if}}{{#unless target}}ES2022{{/unless}}",
    "module": "{{#if module}}{{module}}{{/if}}{{#unless module}}NodeNext{{/unless}}",
    "moduleResolution": "{{#if moduleResolution}}{{moduleResolution}}{{/if}}{{#unless moduleResolution}}NodeNext{{/unless}}",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
`,
      },
    ];

    for (const tpl of builtins) {
      this.#templates.set(tpl.id, tpl);
    }
  }
}

export default TemplateRegistry;
export { TemplateRegistry };
