/**
 * @fileoverview FileGenerator — Handles physical file creation for ClawOS.
 *
 * Responsible for:
 *  - Creating directories recursively
 *  - Writing files with proper encoding and permissions
 *  - Template-based file writing with variable substitution
 *  - Tracking every created artifact for rollback
 *
 * Uses only Node.js built-in modules.
 *
 * @module generator/file-generator
 * @author ClawOS Framework
 * @license MIT
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * @typedef {Object} CreatedFile
 * @property {string} absolutePath  - Full path on disk.
 * @property {'file'|'directory'} type - Whether this entry is a file or directory.
 * @property {number} size          - Byte size (0 for directories).
 * @property {string} encoding      - Encoding used when writing.
 * @property {number} mode          - POSIX permission bits.
 * @property {Date}   createdAt     - Timestamp of creation.
 */

/**
 * @typedef {Object} TemplateVariable
 * @property {string} key   - Variable name (without delimiters).
 * @property {string} value - Replacement value.
 */

/**
 * Default file permission (owner rw, group r, other r).
 * @constant {number}
 */
const DEFAULT_FILE_MODE = 0o644;

/**
 * Default directory permission (owner rwx, group rx, other rx).
 * @constant {number}
 */
const DEFAULT_DIR_MODE = 0o755;

/**
 * Default encoding for all written files.
 * @constant {BufferEncoding}
 */
const DEFAULT_ENCODING = 'utf-8';

/**
 * Regex that matches template placeholders: `{{variableName}}`.
 * Supports optional whitespace inside the braces.
 * @constant {RegExp}
 */
const TEMPLATE_VAR_PATTERN = /\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g;

/**
 * Regex for conditional blocks: `{{#if varName}}...{{/if}}`.
 * @constant {RegExp}
 */
const TEMPLATE_IF_PATTERN = /\{\{#if\s+([a-zA-Z_][\w.]*)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;

/**
 * Regex for loop blocks: `{{#each varName}}...{{/each}}`.
 * @constant {RegExp}
 */
const TEMPLATE_EACH_PATTERN = /\{\{#each\s+([a-zA-Z_][\w.]*)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;

/**
 * FileGenerator creates directories and files on disk, tracks everything it
 * touches, and can roll the entire batch back on failure.
 */
export class FileGenerator {
  /** @type {CreatedFile[]} */
  #createdFiles = [];

  /** @type {string[]} */
  #createdDirs = [];

  /** @type {string} */
  #basePath = '';

  /** @type {boolean} */
  #dryRun = false;

  /**
   * Create a new FileGenerator.
   *
   * @param {Object} [options={}]
   * @param {string} [options.basePath='']          - Root path prepended to all relative writes.
   * @param {boolean} [options.dryRun=false]        - When true, nothing is written to disk.
   * @param {BufferEncoding} [options.encoding='utf-8'] - Default encoding for file writes.
   */
  constructor(options = {}) {
    this.#basePath = options.basePath ?? '';
    this.#dryRun = options.dryRun ?? false;
    /** @type {BufferEncoding} */
    this.encoding = options.encoding ?? DEFAULT_ENCODING;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Resolve a potentially relative path against the configured basePath.
   *
   * @param {string} targetPath - Absolute or relative path.
   * @returns {string} Absolute path.
   */
  resolve(targetPath) {
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    return path.resolve(this.#basePath, targetPath);
  }

  /**
   * Create a directory (and all parents) at the given path.
   *
   * @param {string} dirPath                - Target directory path.
   * @param {Object} [options={}]
   * @param {number} [options.mode=0o755]   - POSIX permission bits.
   * @returns {Promise<string>} The absolute path of the created directory.
   */
  async createDirectory(dirPath, options = {}) {
    const absolute = this.resolve(dirPath);
    const mode = options.mode ?? DEFAULT_DIR_MODE;

    if (!this.#dryRun) {
      await fs.mkdir(absolute, { recursive: true, mode });
    }

    this.#createdDirs.push(absolute);
    this.#recordEntry(absolute, 'directory', 0, this.encoding, mode);
    return absolute;
  }

  /**
   * Write a file to disk.
   *
   * If parent directories do not exist they are created automatically.
   *
   * @param {string} filePath                       - Target file path.
   * @param {string|Buffer} content                 - File content.
   * @param {Object} [options={}]
   * @param {BufferEncoding} [options.encoding]      - Override default encoding.
   * @param {number} [options.mode=0o644]            - POSIX permission bits.
   * @returns {Promise<CreatedFile>} Metadata about the written file.
   */
  async writeFile(filePath, content, options = {}) {
    const absolute = this.resolve(filePath);
    const encoding = options.encoding ?? this.encoding;
    const mode = options.mode ?? DEFAULT_FILE_MODE;

    // Ensure parent directory exists.
    const dir = path.dirname(absolute);
    await this.createDirectory(dir);

    if (!this.#dryRun) {
      await fs.writeFile(absolute, content, { encoding, mode });
    }

    const size = Buffer.isBuffer(content)
      ? content.length
      : Buffer.byteLength(content, encoding);

    return this.#recordEntry(absolute, 'file', size, encoding, mode);
  }

  /**
   * Process a template string by substituting variables, evaluating
   * conditionals, and expanding loops, then write the result.
   *
   * Supported template syntax:
   *  - `{{varName}}`                — Simple variable substitution.
   *  - `{{nested.key}}`             — Dot-notation access.
   *  - `{{#if varName}}...{{/if}}`  — Conditional block.
   *  - `{{#each list}}...{{/each}}` — Loop block ({{item}} inside body).
   *
   * @param {string} filePath                   - Target file path.
   * @param {string} template                   - Template content.
   * @param {Record<string, *>} vars            - Variable map.
   * @param {Object} [options={}]
   * @param {BufferEncoding} [options.encoding]  - Override encoding.
   * @param {number} [options.mode]              - Override permissions.
   * @returns {Promise<CreatedFile>} Metadata about the written file.
   */
  async writeTemplate(filePath, template, vars = {}, options = {}) {
    const rendered = FileGenerator.renderTemplate(template, vars);
    return this.writeFile(filePath, rendered, options);
  }

  /**
   * Delete every file and directory created by this generator instance,
   * in reverse order (files first, then directories).
   *
   * Silently ignores entries that no longer exist (already deleted externally).
   *
   * @returns {Promise<number>} Number of entries removed.
   */
  async rollback() {
    if (this.#dryRun) {
      const count = this.#createdFiles.length;
      this.#createdFiles = [];
      this.#createdDirs = [];
      return count;
    }

    let removed = 0;

    // Remove files first (reverse order so nested files go before parents).
    const files = this.#createdFiles
      .filter((f) => f.type === 'file')
      .reverse();

    for (const entry of files) {
      try {
        await fs.unlink(entry.absolutePath);
        removed++;
      } catch (/** @type {*} */ err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }

    // Remove directories deepest-first to avoid "directory not empty" errors.
    const sortedDirs = [...new Set(this.#createdDirs)]
      .sort((a, b) => b.length - a.length);

    for (const dir of sortedDirs) {
      try {
        await fs.rmdir(dir);
        removed++;
      } catch (/** @type {*} */ err) {
        // ENOENT = already gone, ENOTEMPTY = has external content — both OK.
        if (err.code !== 'ENOENT' && err.code !== 'ENOTEMPTY') {
          throw err;
        }
      }
    }

    this.#createdFiles = [];
    this.#createdDirs = [];
    return removed;
  }

  /**
   * Return an immutable snapshot of every file/directory created so far.
   *
   * @returns {ReadonlyArray<Readonly<CreatedFile>>}
   */
  getCreatedFiles() {
    return Object.freeze([...this.#createdFiles]);
  }

  /**
   * Check whether a path already exists on disk.
   *
   * @param {string} targetPath - Path to check.
   * @returns {Promise<boolean>}
   */
  async exists(targetPath) {
    try {
      await fs.access(this.resolve(targetPath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy an existing file to a new location.
   *
   * @param {string} sourcePath - Source file path.
   * @param {string} destPath   - Destination file path.
   * @returns {Promise<CreatedFile>}
   */
  async copyFile(sourcePath, destPath) {
    const absSrc = this.resolve(sourcePath);
    const absDest = this.resolve(destPath);

    const content = await fs.readFile(absSrc);
    return this.writeFile(absDest, content);
  }

  // ---------------------------------------------------------------------------
  // Static template helpers
  // ---------------------------------------------------------------------------

  /**
   * Render a template string with the given variable map.
   *
   * This is a pure function — no I/O.
   *
   * @param {string} template           - Template content.
   * @param {Record<string, *>} vars    - Variable map.
   * @returns {string} Rendered content.
   */
  static renderTemplate(template, vars = {}) {
    let result = template;

    // 1. Conditionals — {{#if var}}...{{/if}}
    result = result.replace(TEMPLATE_IF_PATTERN, (_match, varName, body) => {
      const value = FileGenerator.#resolveVar(varName, vars);
      if (value && (!Array.isArray(value) || value.length > 0)) {
        return body;
      }
      return '';
    });

    // 2. Loops — {{#each list}}...{{/each}}
    result = result.replace(TEMPLATE_EACH_PATTERN, (_match, varName, body) => {
      const list = FileGenerator.#resolveVar(varName, vars);
      if (!Array.isArray(list)) {
        return '';
      }
      return list
        .map((item, index) => {
          let rendered = body;
          if (typeof item === 'object' && item !== null) {
            // Replace {{key}} with item.key for object items.
            for (const [k, v] of Object.entries(item)) {
              rendered = rendered.replace(
                new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'),
                String(v),
              );
            }
          }
          rendered = rendered.replace(/\{\{\s*item\s*\}\}/g, String(item));
          rendered = rendered.replace(/\{\{\s*index\s*\}\}/g, String(index));
          return rendered;
        })
        .join('');
    });

    // 3. Variable substitution — {{varName}}
    result = result.replace(TEMPLATE_VAR_PATTERN, (_match, varName) => {
      const value = FileGenerator.#resolveVar(varName, vars);
      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    });

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Record a created entry in the internal ledger.
   *
   * @param {string} absolutePath
   * @param {'file'|'directory'} type
   * @param {number} size
   * @param {string} encoding
   * @param {number} mode
   * @returns {CreatedFile}
   */
  #recordEntry(absolutePath, type, size, encoding, mode) {
    /** @type {CreatedFile} */
    const entry = {
      absolutePath,
      type,
      size,
      encoding,
      mode,
      createdAt: new Date(),
    };
    this.#createdFiles.push(entry);
    return entry;
  }

  /**
   * Resolve a dot-notated variable name against a variable map.
   *
   * @param {string} varName           - e.g. "project.name"
   * @param {Record<string, *>} vars
   * @returns {*}
   */
  static #resolveVar(varName, vars) {
    const parts = varName.split('.');
    let current = vars;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = /** @type {Record<string, *>} */ (current)[part];
    }
    return current;
  }
}

export default FileGenerator;
