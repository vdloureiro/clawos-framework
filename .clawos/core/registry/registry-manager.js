/**
 * @module registry-manager
 * @description Component registry that catalogs all available building blocks for
 * the ClawOS framework generation pipeline. Indexes components by id, category,
 * domain, and tags, and supports CRUD operations, multi-criteria search, and
 * dependency resolution between components.
 *
 * The registry loads its data from a co-located `component-catalog.json` file and
 * provides the blueprinting phase with everything it needs to select and compose
 * components into a coherent architecture.
 *
 * Categories:
 *   - pattern      : Reusable architectural / design patterns
 *   - middleware    : Request/response pipeline components
 *   - integration  : External system adapters and connectors
 *   - testing      : Test infrastructure and helpers
 *   - deployment   : Build, CI/CD, and container configs
 *   - utility      : General-purpose helper modules
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to the default component catalog JSON file. */
const DEFAULT_CATALOG_PATH = join(__dirname, 'component-catalog.json');

/**
 * Valid component categories.
 * @readonly
 * @enum {string}
 */
export const ComponentCategory = Object.freeze({
  PATTERN:     'pattern',
  MIDDLEWARE:  'middleware',
  INTEGRATION: 'integration',
  TESTING:     'testing',
  DEPLOYMENT:  'deployment',
  UTILITY:     'utility',
});

/** Set of valid category values for fast membership checks. */
const VALID_CATEGORIES = new Set(Object.values(ComponentCategory));

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ComponentFile
 * @property {string} path - Relative file path within the generated project.
 * @property {string} type - File classification: "source" | "config" | "test" | "doc".
 */

/**
 * @typedef {Object} ComponentEntry
 * @property {string}          id                     - Unique kebab-case identifier.
 * @property {string}          name                   - Human-readable display name.
 * @property {string}          category               - One of {@link ComponentCategory}.
 * @property {string[]}        domain                 - Applicable domains (e.g. "api", "cli", "*").
 * @property {string[]}        tags                   - Searchable tags.
 * @property {string}          description            - What this component provides.
 * @property {string[]}        archetype_compatibility - Compatible architecture archetypes.
 * @property {string[]}        provides               - Capabilities this component delivers.
 * @property {string[]}        dependencies           - IDs of components this one depends on.
 * @property {ComponentFile[]} files                  - Files this component generates.
 */

// ---------------------------------------------------------------------------
// RegistryManager class
// ---------------------------------------------------------------------------

/**
 * Component registry with indexing, search, CRUD, and dependency resolution.
 *
 * Use {@link getRegistryManager} or {@link createRegistryManager} to obtain an
 * instance rather than constructing directly.
 *
 * @example
 * ```js
 * import { getRegistryManager } from './registry-manager.js';
 *
 * const registry = await getRegistryManager();
 * const patterns = registry.getByCategory('pattern');
 * const deps     = registry.getDependencies('auth-jwt');
 * ```
 */
export class RegistryManager {
  // -----------------------------------------------------------------------
  // Private state
  // -----------------------------------------------------------------------

  /** @type {Map<string, ComponentEntry>} Primary store keyed by component id. */
  #components = new Map();

  /** @type {Map<string, Set<string>>} Index: category -> component ids. */
  #categoryIndex = new Map();

  /** @type {Map<string, Set<string>>} Index: domain -> component ids. */
  #domainIndex = new Map();

  /** @type {Map<string, Set<string>>} Index: tag -> component ids. */
  #tagIndex = new Map();

  /** @type {boolean} Whether the catalog has been loaded. */
  #loaded = false;

  /** @type {string} Path to the catalog file used by {@link load}. */
  #catalogPath;

  /**
   * @param {Object} [options]
   * @param {string} [options.catalogPath] - Override path to the catalog JSON.
   */
  constructor(options = {}) {
    this.#catalogPath = options.catalogPath ?? DEFAULT_CATALOG_PATH;
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  /**
   * Loads components from the catalog JSON file and rebuilds all indexes.
   * Subsequent calls reload and replace the in-memory data.
   *
   * @returns {Promise<RegistryManager>} This instance for chaining.
   * @throws {Error} If the catalog file cannot be read or parsed.
   */
  async load() {
    const raw = await readFile(this.#catalogPath, 'utf-8');
    const catalog = JSON.parse(raw);

    if (!catalog.components || !Array.isArray(catalog.components)) {
      throw new Error(
        `[RegistryManager] Invalid catalog format: expected "components" array in ${this.#catalogPath}`,
      );
    }

    // Reset state
    this.#components.clear();
    this.#categoryIndex.clear();
    this.#domainIndex.clear();
    this.#tagIndex.clear();

    for (const entry of catalog.components) {
      this.#validateEntry(entry);
      this.#insertEntry(entry);
    }

    this.#loaded = true;
    return this;
  }

  /**
   * Returns true if the catalog has been loaded at least once.
   *
   * @returns {boolean}
   */
  get isLoaded() {
    return this.#loaded;
  }

  /**
   * Returns the total number of registered components.
   *
   * @returns {number}
   */
  get size() {
    return this.#components.size;
  }

  // -----------------------------------------------------------------------
  // CRUD operations
  // -----------------------------------------------------------------------

  /**
   * Retrieves a component by its unique identifier.
   *
   * @param {string} id - The component id (kebab-case).
   * @returns {ComponentEntry|undefined} A deep copy of the component, or
   *   undefined if not found.
   */
  getById(id) {
    const entry = this.#components.get(id);
    return entry ? this.#cloneEntry(entry) : undefined;
  }

  /**
   * Returns all components belonging to a given category.
   *
   * @param {string} category - One of {@link ComponentCategory} values.
   * @returns {ComponentEntry[]} Deep copies of matching components.
   */
  getByCategory(category) {
    const ids = this.#categoryIndex.get(category);
    if (!ids) return [];
    return [...ids].map((id) => this.#cloneEntry(this.#components.get(id)));
  }

  /**
   * Returns all components applicable to a given domain.
   * Components with domain ["*"] are included for every domain query.
   *
   * @param {string} domain - Domain identifier (e.g. "api", "cli", "testing").
   * @returns {ComponentEntry[]} Deep copies of matching components.
   */
  getByDomain(domain) {
    const specificIds = this.#domainIndex.get(domain) ?? new Set();
    const wildcardIds = this.#domainIndex.get('*') ?? new Set();
    const merged = new Set([...specificIds, ...wildcardIds]);
    return [...merged].map((id) => this.#cloneEntry(this.#components.get(id)));
  }

  /**
   * Returns all registered components.
   *
   * @returns {ComponentEntry[]} Deep copies of all components.
   */
  getAll() {
    return [...this.#components.values()].map((e) => this.#cloneEntry(e));
  }

  /**
   * Adds a new component to the registry. Throws if the id already exists.
   *
   * @param {ComponentEntry} entry - The component to register.
   * @returns {ComponentEntry} A deep copy of the stored component.
   * @throws {Error} If a component with the same id already exists or validation fails.
   */
  add(entry) {
    this.#validateEntry(entry);
    if (this.#components.has(entry.id)) {
      throw new Error(
        `[RegistryManager] Component with id "${entry.id}" already exists. Use update() instead.`,
      );
    }
    this.#insertEntry(entry);
    return this.#cloneEntry(this.#components.get(entry.id));
  }

  /**
   * Updates an existing component in the registry. The entry must include a
   * valid `id` that matches an existing component.
   *
   * @param {string} id    - The component id to update.
   * @param {Partial<ComponentEntry>} patch - Fields to merge into the existing entry.
   * @returns {ComponentEntry} A deep copy of the updated component.
   * @throws {Error} If the component does not exist.
   */
  update(id, patch) {
    const existing = this.#components.get(id);
    if (!existing) {
      throw new Error(
        `[RegistryManager] Component "${id}" not found. Use add() to create it.`,
      );
    }

    // Remove from indexes before update
    this.#removeFromIndexes(existing);

    const updated = { ...existing, ...patch, id }; // id is immutable
    this.#validateEntry(updated);
    this.#components.set(id, updated);
    this.#addToIndexes(updated);

    return this.#cloneEntry(updated);
  }

  /**
   * Removes a component from the registry.
   *
   * @param {string} id - The component id to remove.
   * @returns {boolean} True if the component was found and removed.
   */
  remove(id) {
    const entry = this.#components.get(id);
    if (!entry) return false;

    this.#removeFromIndexes(entry);
    this.#components.delete(id);
    return true;
  }

  /**
   * Returns true if a component with the given id is registered.
   *
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this.#components.has(id);
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /**
   * Searches components by a free-text query and optional structured filters.
   * The query is matched against id, name, description, and tags (case-insensitive).
   * Filters narrow results by category, domain, tags, and archetype compatibility.
   *
   * @param {string} [query='']   - Free-text search string.
   * @param {Object} [filters={}] - Structured filter criteria.
   * @param {string}   [filters.category]     - Filter by exact category.
   * @param {string}   [filters.domain]       - Filter by domain (includes wildcard components).
   * @param {string[]} [filters.tags]         - Filter by tags (AND logic: component must have ALL specified tags).
   * @param {string}   [filters.compatibility] - Filter by archetype compatibility.
   * @returns {ComponentEntry[]} Matching components sorted by relevance (highest first).
   */
  search(query = '', filters = {}) {
    let candidates = [...this.#components.values()];

    // -- Structured filters (applied first for narrowing) --

    if (filters.category) {
      const catIds = this.#categoryIndex.get(filters.category);
      if (!catIds) return [];
      candidates = candidates.filter((c) => catIds.has(c.id));
    }

    if (filters.domain) {
      const domainIds = this.#domainIndex.get(filters.domain) ?? new Set();
      const wildcardIds = this.#domainIndex.get('*') ?? new Set();
      const combined = new Set([...domainIds, ...wildcardIds]);
      candidates = candidates.filter((c) => combined.has(c.id));
    }

    if (filters.tags && filters.tags.length > 0) {
      const requiredTags = filters.tags.map((t) => t.toLowerCase());
      candidates = candidates.filter((c) =>
        requiredTags.every((rt) =>
          c.tags.some((ct) => ct.toLowerCase() === rt),
        ),
      );
    }

    if (filters.compatibility) {
      const archetype = filters.compatibility.toLowerCase();
      candidates = candidates.filter((c) =>
        c.archetype_compatibility.some((a) => a.toLowerCase() === archetype),
      );
    }

    // -- Free-text query scoring --

    if (!query || query.trim() === '') {
      return candidates.map((c) => this.#cloneEntry(c));
    }

    const lowerQuery = query.toLowerCase().trim();
    const terms = lowerQuery.split(/\s+/);

    /** @type {Array<{ entry: ComponentEntry, score: number }>} */
    const scored = [];

    for (const entry of candidates) {
      let score = 0;
      const searchable = [
        entry.id,
        entry.name.toLowerCase(),
        entry.description.toLowerCase(),
        ...entry.tags.map((t) => t.toLowerCase()),
        ...entry.provides.map((p) => p.toLowerCase()),
      ].join(' ');

      for (const term of terms) {
        // Exact id match is highest signal
        if (entry.id === term) {
          score += 100;
        }
        // Name contains term
        if (entry.name.toLowerCase().includes(term)) {
          score += 50;
        }
        // Tag exact match
        if (entry.tags.some((t) => t.toLowerCase() === term)) {
          score += 30;
        }
        // Provides match
        if (entry.provides.some((p) => p.toLowerCase().includes(term))) {
          score += 20;
        }
        // Description contains term
        if (entry.description.toLowerCase().includes(term)) {
          score += 10;
        }
        // General substring match
        if (searchable.includes(term)) {
          score += 5;
        }
      }

      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);

    return scored.map(({ entry }) => this.#cloneEntry(entry));
  }

  // -----------------------------------------------------------------------
  // Dependency resolution
  // -----------------------------------------------------------------------

  /**
   * Returns the full dependency tree for a component, resolved in topological
   * order (dependencies before dependents). Detects circular dependencies.
   *
   * @param {string} componentId - The id of the component to resolve.
   * @returns {ComponentEntry[]} Ordered list of dependencies (the requested
   *   component itself is the last element).
   * @throws {Error} If the component is not found or a circular dependency is detected.
   */
  getDependencies(componentId) {
    const entry = this.#components.get(componentId);
    if (!entry) {
      throw new Error(
        `[RegistryManager] Component "${componentId}" not found in registry.`,
      );
    }

    /** @type {string[]} */
    const resolved = [];
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {Set<string>} */
    const visiting = new Set();

    /**
     * @param {string} id
     * @this {RegistryManager}
     */
    const visit = (id) => {
      if (seen.has(id)) return;

      if (visiting.has(id)) {
        const cycle = [...visiting, id].join(' -> ');
        throw new Error(
          `[RegistryManager] Circular dependency detected: ${cycle}`,
        );
      }

      visiting.add(id);

      const component = this.#components.get(id);
      if (!component) {
        throw new Error(
          `[RegistryManager] Missing dependency: "${id}" required by "${componentId}" ` +
          `is not in the registry.`,
        );
      }

      for (const depId of component.dependencies) {
        visit(depId);
      }

      visiting.delete(id);
      seen.add(id);
      resolved.push(id);
    };

    visit(componentId);

    return resolved.map((id) => this.#cloneEntry(this.#components.get(id)));
  }

  /**
   * Returns all components that are compatible with the given archetype and
   * optionally scoped to a specific domain.
   *
   * @param {string}  archetype  - Architecture archetype (e.g. "microservice", "monolith").
   * @param {string}  [domain]   - Optional domain filter.
   * @returns {ComponentEntry[]} Compatible components.
   */
  getCompatible(archetype, domain) {
    const lowerArchetype = archetype.toLowerCase();

    let candidates = [...this.#components.values()].filter((c) =>
      c.archetype_compatibility.some((a) => a.toLowerCase() === lowerArchetype),
    );

    if (domain) {
      const domainIds = this.#domainIndex.get(domain) ?? new Set();
      const wildcardIds = this.#domainIndex.get('*') ?? new Set();
      const combined = new Set([...domainIds, ...wildcardIds]);
      candidates = candidates.filter((c) => combined.has(c.id));
    }

    return candidates.map((c) => this.#cloneEntry(c));
  }

  /**
   * Returns all components that directly depend on the given component id.
   *
   * @param {string} componentId - The id of the component to find dependents of.
   * @returns {ComponentEntry[]} Components that list componentId as a dependency.
   */
  getDependents(componentId) {
    const dependents = [];
    for (const entry of this.#components.values()) {
      if (entry.dependencies.includes(componentId)) {
        dependents.push(this.#cloneEntry(entry));
      }
    }
    return dependents;
  }

  // -----------------------------------------------------------------------
  // Introspection
  // -----------------------------------------------------------------------

  /**
   * Returns a summary of the registry contents grouped by category.
   *
   * @returns {Record<string, number>} Component counts keyed by category.
   */
  getSummary() {
    /** @type {Record<string, number>} */
    const summary = {};
    for (const [category, ids] of this.#categoryIndex.entries()) {
      summary[category] = ids.size;
    }
    return summary;
  }

  /**
   * Returns all unique domains present in the registry.
   *
   * @returns {string[]}
   */
  getDomains() {
    return [...this.#domainIndex.keys()].sort();
  }

  /**
   * Returns all unique tags present in the registry.
   *
   * @returns {string[]}
   */
  getTags() {
    return [...this.#tagIndex.keys()].sort();
  }

  /**
   * Returns all unique archetype names present in the registry.
   *
   * @returns {string[]}
   */
  getArchetypes() {
    const archetypes = new Set();
    for (const entry of this.#components.values()) {
      for (const arch of entry.archetype_compatibility) {
        archetypes.add(arch);
      }
    }
    return [...archetypes].sort();
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Validates a component entry, throwing if required fields are missing or
   * the category is invalid.
   *
   * @param {ComponentEntry} entry
   * @throws {Error} On validation failure.
   */
  #validateEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('[RegistryManager] Component entry must be a non-null object.');
    }

    const required = ['id', 'name', 'category', 'domain', 'tags', 'description'];
    for (const field of required) {
      if (entry[field] === undefined || entry[field] === null) {
        throw new Error(
          `[RegistryManager] Component "${entry.id ?? '?'}" is missing required field: "${field}".`,
        );
      }
    }

    if (typeof entry.id !== 'string' || entry.id.trim() === '') {
      throw new Error('[RegistryManager] Component "id" must be a non-empty string.');
    }

    if (!VALID_CATEGORIES.has(entry.category)) {
      throw new Error(
        `[RegistryManager] Component "${entry.id}" has invalid category "${entry.category}". ` +
        `Valid categories: ${[...VALID_CATEGORIES].join(', ')}`,
      );
    }

    if (!Array.isArray(entry.domain) || entry.domain.length === 0) {
      throw new Error(
        `[RegistryManager] Component "${entry.id}" must have at least one domain.`,
      );
    }

    if (!Array.isArray(entry.tags)) {
      throw new Error(
        `[RegistryManager] Component "${entry.id}" tags must be an array.`,
      );
    }
  }

  /**
   * Inserts an entry into the primary store and all indexes.
   *
   * @param {ComponentEntry} entry
   */
  #insertEntry(entry) {
    // Normalize optional array fields
    const normalized = {
      ...entry,
      archetype_compatibility: entry.archetype_compatibility ?? [],
      provides: entry.provides ?? [],
      dependencies: entry.dependencies ?? [],
      files: entry.files ?? [],
    };

    this.#components.set(normalized.id, normalized);
    this.#addToIndexes(normalized);
  }

  /**
   * Adds a component to all secondary indexes.
   *
   * @param {ComponentEntry} entry
   */
  #addToIndexes(entry) {
    // Category index
    if (!this.#categoryIndex.has(entry.category)) {
      this.#categoryIndex.set(entry.category, new Set());
    }
    this.#categoryIndex.get(entry.category).add(entry.id);

    // Domain index
    for (const domain of entry.domain) {
      if (!this.#domainIndex.has(domain)) {
        this.#domainIndex.set(domain, new Set());
      }
      this.#domainIndex.get(domain).add(entry.id);
    }

    // Tag index
    for (const tag of entry.tags) {
      const lower = tag.toLowerCase();
      if (!this.#tagIndex.has(lower)) {
        this.#tagIndex.set(lower, new Set());
      }
      this.#tagIndex.get(lower).add(entry.id);
    }
  }

  /**
   * Removes a component from all secondary indexes.
   *
   * @param {ComponentEntry} entry
   */
  #removeFromIndexes(entry) {
    // Category index
    const catSet = this.#categoryIndex.get(entry.category);
    if (catSet) {
      catSet.delete(entry.id);
      if (catSet.size === 0) this.#categoryIndex.delete(entry.category);
    }

    // Domain index
    for (const domain of entry.domain) {
      const domSet = this.#domainIndex.get(domain);
      if (domSet) {
        domSet.delete(entry.id);
        if (domSet.size === 0) this.#domainIndex.delete(domain);
      }
    }

    // Tag index
    for (const tag of entry.tags) {
      const lower = tag.toLowerCase();
      const tagSet = this.#tagIndex.get(lower);
      if (tagSet) {
        tagSet.delete(entry.id);
        if (tagSet.size === 0) this.#tagIndex.delete(lower);
      }
    }
  }

  /**
   * Returns a deep copy of a component entry to prevent external mutation.
   *
   * @param {ComponentEntry} entry
   * @returns {ComponentEntry}
   */
  #cloneEntry(entry) {
    return JSON.parse(JSON.stringify(entry));
  }
}

// ---------------------------------------------------------------------------
// Singleton / factory
// ---------------------------------------------------------------------------

/** @type {RegistryManager|null} */
let _instance = null;

/**
 * Returns a shared RegistryManager instance. On first call (or when `fresh` is
 * true) a new instance is created. The catalog is NOT automatically loaded;
 * call `.load()` or use {@link getRegistryManager} for auto-loading.
 *
 * @param {Object} [options]
 * @param {boolean} [options.fresh]       - Force a new instance.
 * @param {string}  [options.catalogPath] - Override catalog file path.
 * @returns {RegistryManager}
 */
export function createRegistryManager(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new RegistryManager(options);
  }
  return _instance;
}

/**
 * Returns a shared RegistryManager instance that is guaranteed to have its
 * catalog loaded. This is the recommended entry point for most consumers.
 *
 * @param {Object} [options]
 * @param {boolean} [options.fresh]       - Force a new instance + reload.
 * @param {string}  [options.catalogPath] - Override catalog file path.
 * @returns {Promise<RegistryManager>}
 */
export async function getRegistryManager(options = {}) {
  const manager = createRegistryManager(options);
  if (!manager.isLoaded || options.fresh) {
    await manager.load();
  }
  return manager;
}

export default RegistryManager;
