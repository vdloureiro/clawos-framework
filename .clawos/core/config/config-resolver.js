/**
 * @module config-resolver
 * @description Three-layer hierarchical configuration resolver for ClawOS.
 *
 * Configuration is merged from three layers with increasing precedence:
 *   L1 (Framework)  - Built-in defaults from the schema ({@link config-schema}).
 *   L2 (Project)    - Project-level overrides from `.clawos-config.yaml`.
 *   L3 (User)       - User preferences from `~/.clawos/preferences.yaml`.
 *
 * Deep merge follows L3 > L2 > L1 precedence (user wins over project wins
 * over framework defaults).
 *
 * Additional capabilities:
 *   - Simple YAML parsing (no external dependencies)
 *   - Environment variable interpolation (`${ENV_VAR}` syntax)
 *   - Schema validation via {@link config-schema}
 *   - In-memory cache with configurable TTL
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getDefaults, validateConfig } from './config-schema.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default cache time-to-live in milliseconds (5 minutes). */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** File name for project-level config. */
const PROJECT_CONFIG_FILE = '.clawos-config.yaml';

/** Relative path under the user's home directory for user preferences. */
const USER_CONFIG_PATH = '.clawos/preferences.yaml';

// ---------------------------------------------------------------------------
// Minimal YAML Parser
// ---------------------------------------------------------------------------

/**
 * A minimal YAML parser that handles the subset of YAML used by ClawOS config
 * files. Supports:
 *   - Key-value pairs (scalars: string, number, boolean, null)
 *   - Nested objects (indentation-based)
 *   - Single-line comments (# ...)
 *   - Unquoted and quoted strings (single / double)
 *   - Flow-style inline arrays: [a, b, c]
 *
 * Does NOT support: multi-line strings, anchors/aliases, tags, block arrays
 * with `-` notation, or multi-document streams. For those, a full YAML library
 * would be required.
 *
 * @param {string} yamlText - Raw YAML text.
 * @returns {Record<string, *>} Parsed object.
 */
export function parseSimpleYaml(yamlText) {
  if (!yamlText || typeof yamlText !== 'string') {
    return {};
  }

  const lines = yamlText.split('\n');
  const root = {};

  /**
   * Stack of { indent, obj } to track nesting.
   * @type {Array<{ indent: number, obj: Record<string, *> }>}
   */
  const stack = [{ indent: -1, obj: root }];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Strip full-line comments and blank lines.
    const stripped = raw.replace(/#.*$/, '');
    if (stripped.trim().length === 0) continue;

    // Calculate indentation (number of leading spaces).
    const indent = raw.search(/\S/);
    if (indent === -1) continue;

    // Find the key-value separator.
    const colonIdx = stripped.indexOf(':');
    if (colonIdx === -1) continue;

    const key = stripped.slice(0, colonIdx).trim();
    const rawValue = stripped.slice(colonIdx + 1).trim();

    // Pop the stack back to the correct parent.
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (rawValue === '' || rawValue === undefined) {
      // This key introduces a nested object.
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      // Scalar value.
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

/**
 * Parses a raw YAML scalar string into its JavaScript equivalent.
 *
 * @param {string} raw - The raw string value.
 * @returns {string|number|boolean|null|string[]}
 */
function parseScalar(raw) {
  if (raw === 'null' || raw === '~') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Inline array: [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(',').map((s) => parseScalar(s.trim()));
  }

  // Quoted strings.
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  // Number.
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }

  return raw;
}

// ---------------------------------------------------------------------------
// Deep merge
// ---------------------------------------------------------------------------

/**
 * Deep-merges `source` into `target`. Arrays in source replace arrays in
 * target (no concatenation). Primitive values in source overwrite those in
 * target.
 *
 * @param {Record<string, *>} target
 * @param {Record<string, *>} source
 * @returns {Record<string, *>} The mutated `target`.
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      target[key] = deepMerge({ ...tgtVal }, srcVal);
    } else {
      target[key] = srcVal;
    }
  }

  return target;
}

// ---------------------------------------------------------------------------
// Environment variable interpolation
// ---------------------------------------------------------------------------

/**
 * Recursively walks an object and replaces any `${ENV_VAR}` tokens in string
 * values with the corresponding environment variable. Unknown variables are
 * left as-is (a warning is collected).
 *
 * @param {*}        obj      - The value to interpolate.
 * @param {string[]} warnings - Accumulator for interpolation warnings.
 * @returns {*} The interpolated value.
 */
function interpolateEnvVars(obj, warnings) {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        warnings.push(`Environment variable "${varName}" is not set; left as literal.`);
        return `\${${varName}}`;
      }
      return value;
    });
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateEnvVars(item, warnings));
  }

  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value, warnings);
    }
    return result;
  }

  return obj;
}

// ---------------------------------------------------------------------------
// Deep getter / setter by dot-path
// ---------------------------------------------------------------------------

/**
 * Retrieves a deeply nested value by dot-separated path.
 *
 * @param {Record<string, *>} obj  - The object to query.
 * @param {string}            path - Dot-separated path (e.g. "generation.language").
 * @returns {*} The value, or `undefined` if the path does not exist.
 */
function getByPath(obj, path) {
  const segments = path.split('.');
  let current = obj;

  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[seg];
  }

  return current;
}

/**
 * Sets a deeply nested value by dot-separated path, creating intermediate
 * objects as needed.
 *
 * @param {Record<string, *>} obj   - The object to mutate.
 * @param {string}            path  - Dot-separated path.
 * @param {*}                 value - The value to set.
 */
function setByPath(obj, path, value) {
  const segments = path.split('.');
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] === undefined || current[seg] === null || typeof current[seg] !== 'object') {
      current[seg] = {};
    }
    current = current[seg];
  }

  current[segments[segments.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// ConfigResolver class
// ---------------------------------------------------------------------------

/**
 * Three-layer hierarchical configuration resolver.
 *
 * Usage:
 * ```js
 * const resolver = new ConfigResolver({ projectRoot: process.cwd() });
 * const config = resolver.resolve();
 * const lang = resolver.get('generation.language'); // 'javascript'
 * ```
 *
 * @fires ConfigResolver does not emit events (stateless utility).
 */
export class ConfigResolver {
  /** @type {string} */
  #projectRoot;

  /** @type {number} */
  #cacheTtlMs;

  /** @type {Record<string, *>|null} */
  #cache;

  /** @type {number} */
  #cacheTimestamp;

  /** @type {string[]} */
  #warnings;

  /**
   * @param {Object}  [options]
   * @param {string}  [options.projectRoot=process.cwd()] - Path to the project root
   *                   where `.clawos-config.yaml` is expected.
   * @param {number}  [options.cacheTtlMs]                - Cache TTL in ms.
   */
  constructor(options = {}) {
    this.#projectRoot = options.projectRoot ?? process.cwd();
    this.#cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.#cache = null;
    this.#cacheTimestamp = 0;
    this.#warnings = [];
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Resolves the full configuration by merging L1 defaults, L2 project config,
   * and L3 user preferences. The result is cached until TTL expiry or an
   * explicit {@link reload}.
   *
   * @returns {{ config: Record<string, *>, validation: import('./config-schema.js').ValidationResult, warnings: string[] }}
   */
  resolve() {
    // Return cache if still valid.
    if (this.#cache && Date.now() - this.#cacheTimestamp < this.#cacheTtlMs) {
      return {
        config: this.#cache,
        validation: validateConfig(this.#cache),
        warnings: [...this.#warnings],
      };
    }

    this.#warnings = [];

    // L1 - Framework defaults.
    const l1 = this.getDefaults();

    // L2 - Project-level config.
    const l2 = this.#loadProjectConfig();

    // L3 - User-level preferences.
    const l3 = this.#loadUserConfig();

    // Merge: L1 <- L2 <- L3  (higher layers win).
    let merged = deepMerge({ ...l1 }, l2);
    merged = deepMerge(merged, l3);

    // Interpolate environment variables.
    merged = interpolateEnvVars(merged, this.#warnings);

    // Validate against schema.
    const validation = validateConfig(merged);

    // Cache the result.
    this.#cache = merged;
    this.#cacheTimestamp = Date.now();

    return {
      config: merged,
      validation,
      warnings: [...this.#warnings],
    };
  }

  /**
   * Retrieves a single config value by dot-separated path.
   * Triggers a {@link resolve} if the cache is cold.
   *
   * @param {string} path - e.g. `"generation.language"`.
   * @returns {*}
   */
  get(path) {
    const { config } = this.resolve();
    return getByPath(config, path);
  }

  /**
   * Sets a runtime override for a config value (in-memory only, not persisted).
   * Useful for CLI flag overrides or one-off test scenarios.
   *
   * @param {string} path  - Dot-separated config path.
   * @param {*}      value - The value to set.
   */
  set(path, value) {
    // Ensure the cache is warm.
    if (!this.#cache) {
      this.resolve();
    }
    setByPath(this.#cache, path, value);
  }

  /**
   * Invalidates the in-memory cache so that the next {@link resolve} call
   * re-reads all config sources from disk.
   */
  reload() {
    this.#cache = null;
    this.#cacheTimestamp = 0;
    this.#warnings = [];
  }

  /**
   * Returns the L1 framework defaults derived from the schema.
   *
   * @returns {Record<string, *>}
   */
  getDefaults() {
    return getDefaults();
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Loads and parses the project-level config file (`.clawos-config.yaml`).
   *
   * @returns {Record<string, *>} Parsed config or empty object if the file
   *          does not exist.
   */
  #loadProjectConfig() {
    const filePath = join(this.#projectRoot, PROJECT_CONFIG_FILE);
    return this.#loadYamlFile(filePath, 'project');
  }

  /**
   * Loads and parses the user-level preferences file
   * (`~/.clawos/preferences.yaml`).
   *
   * @returns {Record<string, *>} Parsed config or empty object if the file
   *          does not exist.
   */
  #loadUserConfig() {
    const filePath = join(homedir(), USER_CONFIG_PATH);
    return this.#loadYamlFile(filePath, 'user');
  }

  /**
   * Reads and parses a YAML file. Returns an empty object and logs a warning
   * if the file is missing or unparseable.
   *
   * @param {string} filePath - Absolute path to the YAML file.
   * @param {string} label    - Human-readable layer label for warnings.
   * @returns {Record<string, *>}
   */
  #loadYamlFile(filePath, label) {
    if (!existsSync(filePath)) {
      return {};
    }

    try {
      const raw = readFileSync(filePath, 'utf-8');
      return parseSimpleYaml(raw);
    } catch (err) {
      this.#warnings.push(
        `Failed to read ${label} config at "${filePath}": ${err.message}`,
      );
      return {};
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** @type {ConfigResolver|null} */
let _instance = null;

/**
 * Returns a shared ConfigResolver instance (singleton-friendly).
 *
 * @param {Object}  [options]
 * @param {string}  [options.projectRoot]
 * @param {number}  [options.cacheTtlMs]
 * @param {boolean} [options.fresh] - Force creation of a new instance.
 * @returns {ConfigResolver}
 */
export function createConfigResolver(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new ConfigResolver(options);
  }
  return _instance;
}

export default ConfigResolver;
