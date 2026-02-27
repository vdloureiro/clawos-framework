/**
 * @module claude-integration/mcp-configurator
 * @description Generates MCP (Model Context Protocol) configuration for frameworks
 * produced by ClawOS.
 *
 * The configurator recommends MCP servers based on the framework's domain and
 * generates a `.claude/mcp.json` configuration file that enables Claude Code to
 * interact with external tools — filesystem access, GitHub, databases, browsers,
 * and memory stores — through the standardized MCP interface.
 *
 * @author ClawOS Framework
 * @license MIT
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Type imports (JSDoc only)
// ---------------------------------------------------------------------------

/**
 * @typedef {import('../blueprint/blueprint-engine.js').RequirementsProfile} RequirementsProfile
 */

/**
 * @typedef {Object} McpServerDefinition
 * @property {string}   name        - Unique server identifier (e.g., "filesystem").
 * @property {string}   description - Human-readable description of what the server provides.
 * @property {string}   command     - The command used to start the MCP server process.
 * @property {string[]} args        - Default arguments passed to the server command.
 * @property {Record<string, string>} [env] - Environment variables for the server process.
 * @property {string[]} capabilities - List of capabilities the server provides.
 * @property {string}   category    - Functional category (storage, vcs, browser, data, ai).
 */

/**
 * @typedef {Object} McpConfig
 * @property {string}  version      - Configuration schema version.
 * @property {Object}  mcpServers   - Map of server name to server configuration.
 * @property {Object}  [metadata]   - Optional metadata about the configuration.
 */

/**
 * @typedef {Object} McpGenerationResult
 * @property {McpConfig}             config           - The generated MCP configuration object.
 * @property {McpServerDefinition[]} recommendedServers - Full definitions of recommended servers.
 * @property {string}                configJson       - The serialized JSON string.
 * @property {string}                [outputPath]     - Absolute path where the config was written
 *                                                      (undefined if not written to disk).
 */

// ---------------------------------------------------------------------------
// MCP server registry
// ---------------------------------------------------------------------------

/**
 * Canonical MCP server definitions. Each entry describes a server that Claude
 * Code can connect to for extended capabilities.
 *
 * @type {Record<string, McpServerDefinition>}
 */
const MCP_SERVER_REGISTRY = {
  filesystem: {
    name: 'filesystem',
    description:
      'Provides Claude with direct filesystem access for reading, writing, and ' +
      'searching files within the project directory. Essential for any code project.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    capabilities: ['read_file', 'write_file', 'list_directory', 'search_files', 'get_file_info'],
    category: 'storage',
  },

  memory: {
    name: 'memory',
    description:
      'Provides persistent key-value memory that persists across Claude sessions. ' +
      'Useful for storing project context, decisions, and learned patterns.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    capabilities: ['store', 'retrieve', 'list_keys', 'delete', 'search'],
    category: 'ai',
  },

  github: {
    name: 'github',
    description:
      'Provides Claude with GitHub API access for managing issues, pull requests, ' +
      'repositories, and code reviews directly from the conversation.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: '<your-github-token>',
    },
    capabilities: [
      'list_repos',
      'create_issue',
      'list_issues',
      'create_pull_request',
      'list_pull_requests',
      'get_file_contents',
      'search_code',
    ],
    category: 'vcs',
  },

  puppeteer: {
    name: 'puppeteer',
    description:
      'Provides Claude with browser automation capabilities for testing web UIs, ' +
      'taking screenshots, and interacting with web applications.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    capabilities: [
      'navigate',
      'screenshot',
      'click',
      'type',
      'evaluate',
      'wait_for_selector',
      'get_console_logs',
    ],
    category: 'browser',
  },

  database: {
    name: 'database',
    description:
      'Provides Claude with database access for querying, inspecting schemas, ' +
      'and managing data. Supports SQLite by default; configurable for PostgreSQL and MySQL.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', './data/database.sqlite'],
    capabilities: ['query', 'list_tables', 'describe_table', 'insert', 'update', 'delete'],
    category: 'data',
  },
};

// ---------------------------------------------------------------------------
// Domain-to-server mapping
// ---------------------------------------------------------------------------

/**
 * Maps each framework domain to the MCP servers recommended for it.
 * Servers are listed in priority order.
 *
 * @type {Record<string, string[]>}
 */
const DOMAIN_SERVER_MAP = {
  api:        ['filesystem', 'github', 'database'],
  cli:        ['filesystem', 'github'],
  testing:    ['filesystem', 'github', 'puppeteer'],
  ui:         ['filesystem', 'github', 'puppeteer'],
  data:       ['filesystem', 'database'],
  'ai-agent': ['filesystem', 'github', 'memory'],
  automation: ['filesystem', 'github'],
  plugin:     ['filesystem', 'github'],
};

/**
 * Fallback server list for domains not explicitly mapped.
 * @type {string[]}
 */
const DEFAULT_SERVERS = ['filesystem', 'github'];

// ---------------------------------------------------------------------------
// McpConfigurator class
// ---------------------------------------------------------------------------

/**
 * Generates MCP (Model Context Protocol) configuration for frameworks produced
 * by ClawOS.
 *
 * The configurator examines the framework's domain and requirements profile to
 * recommend appropriate MCP servers, then generates a `.claude/mcp.json`
 * configuration file that enables Claude Code to leverage those servers.
 */
class McpConfigurator {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate the MCP configuration for a framework based on its requirements
   * profile.
   *
   * Optionally writes the configuration to disk if `outputPath` is provided
   * on the profile or as a second argument.
   *
   * @param {RequirementsProfile} profile     - The requirements profile.
   * @param {string}              [outputDir] - Directory where `.claude/mcp.json`
   *                                            will be written. If omitted, the
   *                                            config is generated in-memory only.
   * @returns {Promise<McpGenerationResult>}
   */
  async generate(profile, outputDir) {
    if (!profile || !profile.name) {
      throw new Error('McpConfigurator.generate: profile.name is required');
    }

    const domain = (profile.domain || 'universal').toLowerCase().replace(/\s+/g, '-');
    const recommendedServers = this.getRecommendedServers(domain);
    const config = this.generateConfig(recommendedServers, profile);
    const configJson = JSON.stringify(config, null, 2);

    /** @type {McpGenerationResult} */
    const result = {
      config,
      recommendedServers,
      configJson,
    };

    // Write to disk if outputDir is provided
    if (outputDir) {
      const claudeDir = path.join(outputDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });

      const outputPath = path.join(claudeDir, 'mcp.json');
      await fs.writeFile(outputPath, configJson, 'utf-8');
      result.outputPath = outputPath;
    }

    return result;
  }

  /**
   * Get the recommended MCP servers for a given domain.
   *
   * Returns full server definition objects for each recommended server,
   * in priority order.
   *
   * @param {string} domain - The framework domain (api, cli, ui, etc.).
   * @returns {McpServerDefinition[]}
   */
  getRecommendedServers(domain) {
    const normalizedDomain = domain.toLowerCase().replace(/\s+/g, '-');
    const serverNames = DOMAIN_SERVER_MAP[normalizedDomain] || DEFAULT_SERVERS;

    /** @type {McpServerDefinition[]} */
    const servers = [];

    for (const name of serverNames) {
      const definition = MCP_SERVER_REGISTRY[name];
      if (definition) {
        servers.push({ ...definition });
      }
    }

    return servers;
  }

  /**
   * Generate the MCP configuration object from a list of server definitions.
   *
   * The returned object conforms to the `.claude/mcp.json` schema expected
   * by Claude Code.
   *
   * @param {McpServerDefinition[]} servers  - Server definitions to include.
   * @param {RequirementsProfile}   [profile] - Optional profile for metadata.
   * @returns {McpConfig}
   */
  generateConfig(servers, profile) {
    /** @type {Record<string, Object>} */
    const mcpServers = {};

    for (const server of servers) {
      /** @type {Record<string, unknown>} */
      const serverEntry = {
        command: server.command,
        args: this.#resolveArgs(server),
      };

      // Include environment variables if defined
      if (server.env && Object.keys(server.env).length > 0) {
        serverEntry.env = { ...server.env };
      }

      mcpServers[server.name] = serverEntry;
    }

    /** @type {McpConfig} */
    const config = {
      version: '1.0',
      mcpServers,
    };

    // Add metadata for documentation purposes
    if (profile) {
      config.metadata = {
        generatedBy: 'ClawOS',
        projectName: profile.name,
        domain: profile.domain || 'universal',
        generatedAt: new Date().toISOString(),
        serverDescriptions: this.#buildDescriptionMap(servers),
      };
    }

    return config;
  }

  // -----------------------------------------------------------------------
  // Query / introspection helpers
  // -----------------------------------------------------------------------

  /**
   * Get the full server registry (all known MCP servers).
   *
   * @returns {Record<string, McpServerDefinition>}
   */
  getServerRegistry() {
    // Return a deep copy to prevent external mutation
    return JSON.parse(JSON.stringify(MCP_SERVER_REGISTRY));
  }

  /**
   * Get the domain-to-server mapping table.
   *
   * @returns {Record<string, string[]>}
   */
  getDomainMap() {
    return JSON.parse(JSON.stringify(DOMAIN_SERVER_MAP));
  }

  /**
   * Check whether a specific MCP server is recommended for a domain.
   *
   * @param {string} domain     - The framework domain.
   * @param {string} serverName - The MCP server name.
   * @returns {boolean}
   */
  isRecommended(domain, serverName) {
    const normalizedDomain = domain.toLowerCase().replace(/\s+/g, '-');
    const serverNames = DOMAIN_SERVER_MAP[normalizedDomain] || DEFAULT_SERVERS;
    return serverNames.includes(serverName);
  }

  /**
   * Get all available server names.
   *
   * @returns {string[]}
   */
  getAvailableServers() {
    return Object.keys(MCP_SERVER_REGISTRY);
  }

  /**
   * Get a single server definition by name.
   *
   * @param {string} name - The server name.
   * @returns {McpServerDefinition|null}
   */
  getServerDefinition(name) {
    const def = MCP_SERVER_REGISTRY[name];
    return def ? { ...def } : null;
  }

  /**
   * Get all supported domains.
   *
   * @returns {string[]}
   */
  getSupportedDomains() {
    return Object.keys(DOMAIN_SERVER_MAP);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve server arguments, potentially customizing them based on context.
   *
   * @param {McpServerDefinition} server
   * @returns {string[]}
   */
  #resolveArgs(server) {
    // Return a copy of the default args.
    // In future versions, this could customize args based on the project
    // (e.g., setting the database path for the database server).
    return [...server.args];
  }

  /**
   * Build a map of server names to their descriptions for inclusion in metadata.
   *
   * @param {McpServerDefinition[]} servers
   * @returns {Record<string, string>}
   */
  #buildDescriptionMap(servers) {
    /** @type {Record<string, string>} */
    const descriptions = {};
    for (const server of servers) {
      descriptions[server.name] = server.description;
    }
    return descriptions;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  McpConfigurator,
  MCP_SERVER_REGISTRY,
  DOMAIN_SERVER_MAP,
  DEFAULT_SERVERS,
};
export default McpConfigurator;
