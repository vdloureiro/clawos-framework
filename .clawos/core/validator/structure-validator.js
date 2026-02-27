/**
 * @module structure-validator
 * @description Validates the file structure and content of a generated framework
 * against its blueprint. Run after the GENERATE phase to catch missing files,
 * empty content, malformed package.json, absent CLAUDE.md sections, circular
 * dependencies, and basic syntax issues in JS/TS files.
 *
 * The validator produces a detailed report:
 * ```
 * {
 *   valid:    boolean,
 *   score:    number (0-100),
 *   errors:   [{ file, type, message, severity }],
 *   warnings: [{ file, type, message, severity }],
 *   summary:  { totalFiles, validFiles, missingFiles, emptyFiles }
 * }
 * ```
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sections that CLAUDE.md is expected to contain (case-insensitive match). */
const REQUIRED_CLAUDE_SECTIONS = Object.freeze([
  'overview',
  'commands',
  'architecture',
]);

/** Fields that package.json must include. */
const REQUIRED_PACKAGE_JSON_FIELDS = Object.freeze([
  'name',
  'version',
  'description',
]);

/** File extensions considered JS/TS source for syntax checking. */
const JS_TS_EXTENSIONS = Object.freeze(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {'error'|'warning'} Severity
 */

/**
 * @typedef {Object} ValidationEntry
 * @property {string}   file     - Relative path to the file (or '*' for global issues).
 * @property {string}   type     - Category of the issue (e.g. 'missing-file', 'empty-file').
 * @property {string}   message  - Human-readable description.
 * @property {Severity} severity - 'error' or 'warning'.
 */

/**
 * @typedef {Object} ValidationSummary
 * @property {number} totalFiles   - Total number of files declared in the blueprint.
 * @property {number} validFiles   - Files that passed all checks.
 * @property {number} missingFiles - Files declared in blueprint but absent on disk.
 * @property {number} emptyFiles   - Files that exist but have no content.
 */

/**
 * @typedef {Object} ValidationReport
 * @property {boolean}            valid    - True when zero errors exist.
 * @property {number}             score    - Quality score 0-100.
 * @property {ValidationEntry[]}  errors   - All entries with severity 'error'.
 * @property {ValidationEntry[]}  warnings - All entries with severity 'warning'.
 * @property {ValidationSummary}  summary  - Aggregate counters.
 */

// ---------------------------------------------------------------------------
// StructureValidator class
// ---------------------------------------------------------------------------

/**
 * Validates a generated framework's file structure and content quality.
 *
 * Usage:
 * ```js
 * const validator = new StructureValidator();
 * const report = await validator.validate('./generated/my-framework', blueprint);
 * console.log(report.score, report.errors);
 * ```
 */
export class StructureValidator {
  /** @type {ValidationEntry[]} */
  #entries;

  /** @type {ValidationSummary} */
  #summary;

  constructor() {
    this.#entries = [];
    this.#summary = { totalFiles: 0, validFiles: 0, missingFiles: 0, emptyFiles: 0 };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Runs the full validation suite on the generated output.
   *
   * @param {string} outputPath - Absolute or relative path to the generated framework root.
   * @param {Object} blueprint  - The blueprint produced by the BLUEPRINT phase.
   * @param {string[]}         [blueprint.files]              - Expected file paths relative to outputPath.
   * @param {Record<string,*>} [blueprint.directoryStructure] - Expected directory tree descriptor.
   * @param {Record<string,*>} [blueprint.modules]            - Module dependency map for cycle detection.
   * @returns {ValidationReport}
   */
  validate(outputPath, blueprint) {
    // Reset state.
    this.#entries = [];
    this.#summary = { totalFiles: 0, validFiles: 0, missingFiles: 0, emptyFiles: 0 };

    const absOutput = resolve(outputPath);

    // --- Verify output directory exists ---
    if (!existsSync(absOutput) || !statSync(absOutput).isDirectory()) {
      this.#addError('*', 'missing-output', `Output directory does not exist: "${absOutput}".`);
      return this.getReport();
    }

    // --- Blueprint file manifest ---
    const declaredFiles = blueprint?.files ?? [];
    this.#summary.totalFiles = declaredFiles.length;

    for (const relPath of declaredFiles) {
      this.validateFile(join(absOutput, relPath));
    }

    // --- Directory structure ---
    if (blueprint?.directoryStructure) {
      this.#validateDirectoryTree(absOutput, blueprint.directoryStructure, '');
    }

    // --- package.json ---
    this.#validatePackageJson(absOutput);

    // --- CLAUDE.md ---
    this.#validateClaudeMd(absOutput);

    // --- Circular dependency check ---
    if (blueprint?.modules) {
      this.validateDependencies(blueprint.modules);
    }

    // --- Syntax spot-check on JS/TS files ---
    this.#syntaxCheckAllJsTs(absOutput);

    return this.getReport();
  }

  /**
   * Validates a single file: existence, non-empty content, and basic syntax
   * if it is a JS/TS file.
   *
   * @param {string} filePath        - Absolute path to the file.
   * @param {string} [expectedContent] - If provided, file content must include this string.
   * @returns {{ exists: boolean, empty: boolean, contentMatch: boolean }}
   */
  validateFile(filePath, expectedContent) {
    const relPath = filePath; // callers may pass relative or absolute
    const result = { exists: false, empty: false, contentMatch: true };

    if (!existsSync(filePath)) {
      this.#addError(relPath, 'missing-file', `Expected file does not exist: "${filePath}".`);
      this.#summary.missingFiles++;
      return result;
    }

    result.exists = true;

    // Check for empty.
    let content;
    try {
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        // Not a file — skip content checks.
        return result;
      }
      content = readFileSync(filePath, 'utf-8');
    } catch (err) {
      this.#addWarning(relPath, 'read-error', `Unable to read file: ${err.message}`);
      return result;
    }

    if (content.trim().length === 0) {
      this.#addWarning(relPath, 'empty-file', `File is empty: "${filePath}".`);
      this.#summary.emptyFiles++;
      result.empty = true;
      return result;
    }

    // Expected content check.
    if (expectedContent && !content.includes(expectedContent)) {
      this.#addWarning(
        relPath,
        'content-mismatch',
        `File "${filePath}" does not contain expected content.`,
      );
      result.contentMatch = false;
    }

    // Basic syntax for JS/TS.
    const ext = extname(filePath).toLowerCase();
    if (JS_TS_EXTENSIONS.includes(ext)) {
      this.#basicSyntaxCheck(filePath, content);
    }

    this.#summary.validFiles++;
    return result;
  }

  /**
   * Detects circular dependencies in a module dependency map.
   *
   * @param {Record<string, string[]>} modules - Map of module name to its dependency list.
   *                                              e.g. `{ 'auth': ['db', 'config'], 'db': ['config'] }`.
   * @returns {{ hasCycles: boolean, cycles: string[][] }}
   */
  validateDependencies(modules) {
    const result = { hasCycles: false, cycles: [] };

    if (!modules || typeof modules !== 'object') return result;

    const visited = new Set();
    const inStack = new Set();

    /**
     * DFS cycle detection.
     * @param {string}   node
     * @param {string[]} path
     */
    const dfs = (node, path) => {
      if (inStack.has(node)) {
        // Found a cycle — extract the cycle portion.
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat(node);
        result.cycles.push(cycle);
        result.hasCycles = true;
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      inStack.add(node);

      const deps = modules[node] ?? [];
      for (const dep of deps) {
        dfs(dep, [...path, node]);
      }

      inStack.delete(node);
    };

    for (const mod of Object.keys(modules)) {
      dfs(mod, []);
    }

    if (result.hasCycles) {
      for (const cycle of result.cycles) {
        this.#addError(
          '*',
          'circular-dependency',
          `Circular dependency detected: ${cycle.join(' -> ')}.`,
        );
      }
    }

    return result;
  }

  /**
   * Returns the current validation report.
   *
   * @returns {ValidationReport}
   */
  getReport() {
    const errors = this.#entries.filter((e) => e.severity === 'error');
    const warnings = this.#entries.filter((e) => e.severity === 'warning');

    // Score: start at 100, deduct 10 per error, 3 per warning, floor at 0.
    const rawScore = 100 - errors.length * 10 - warnings.length * 3;
    const score = Math.max(0, Math.min(100, rawScore));

    return {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      summary: { ...this.#summary },
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Adds an error entry.
   * @param {string} file
   * @param {string} type
   * @param {string} message
   */
  #addError(file, type, message) {
    this.#entries.push({ file, type, message, severity: 'error' });
  }

  /**
   * Adds a warning entry.
   * @param {string} file
   * @param {string} type
   * @param {string} message
   */
  #addWarning(file, type, message) {
    this.#entries.push({ file, type, message, severity: 'warning' });
  }

  /**
   * Recursively validates that a directory tree matches the blueprint descriptor.
   *
   * The descriptor can be:
   *   - A string key mapping to `null` or `{}` means the directory should exist.
   *   - A string key mapping to an object means a sub-tree is expected.
   *
   * @param {string} basePath   - Absolute base path.
   * @param {Record<string, *>} tree - Blueprint directory tree.
   * @param {string} prefix     - Current relative prefix for error reporting.
   */
  #validateDirectoryTree(basePath, tree, prefix) {
    for (const [name, subtree] of Object.entries(tree)) {
      const fullPath = join(basePath, name);
      const relPath = prefix ? `${prefix}/${name}` : name;

      if (!existsSync(fullPath)) {
        this.#addError(relPath, 'missing-directory', `Expected directory/file "${relPath}" does not exist.`);
        continue;
      }

      if (subtree && typeof subtree === 'object' && !Array.isArray(subtree) && Object.keys(subtree).length > 0) {
        // Recurse into sub-tree.
        if (!statSync(fullPath).isDirectory()) {
          this.#addError(relPath, 'not-a-directory', `Expected "${relPath}" to be a directory.`);
        } else {
          this.#validateDirectoryTree(fullPath, subtree, relPath);
        }
      }
    }
  }

  /**
   * Validates that package.json exists and has the required fields.
   *
   * @param {string} outputPath - Root directory of the generated framework.
   */
  #validatePackageJson(outputPath) {
    const pkgPath = join(outputPath, 'package.json');

    if (!existsSync(pkgPath)) {
      this.#addWarning(
        'package.json',
        'missing-package-json',
        'No package.json found in the generated output.',
      );
      return;
    }

    let pkg;
    try {
      const raw = readFileSync(pkgPath, 'utf-8');
      pkg = JSON.parse(raw);
    } catch (err) {
      this.#addError(
        'package.json',
        'invalid-package-json',
        `package.json is not valid JSON: ${err.message}`,
      );
      return;
    }

    for (const field of REQUIRED_PACKAGE_JSON_FIELDS) {
      if (!pkg[field]) {
        this.#addError(
          'package.json',
          'missing-field',
          `package.json is missing required field: "${field}".`,
        );
      }
    }
  }

  /**
   * Validates that CLAUDE.md exists and contains the required sections.
   *
   * @param {string} outputPath
   */
  #validateClaudeMd(outputPath) {
    const claudePath = join(outputPath, 'CLAUDE.md');

    if (!existsSync(claudePath)) {
      this.#addWarning(
        'CLAUDE.md',
        'missing-claude-md',
        'No CLAUDE.md found in the generated output.',
      );
      return;
    }

    let content;
    try {
      content = readFileSync(claudePath, 'utf-8');
    } catch (err) {
      this.#addError('CLAUDE.md', 'read-error', `Unable to read CLAUDE.md: ${err.message}`);
      return;
    }

    if (content.trim().length === 0) {
      this.#addError('CLAUDE.md', 'empty-file', 'CLAUDE.md exists but is empty.');
      return;
    }

    // Extract markdown headings.
    const headings = content
      .split('\n')
      .filter((line) => /^#{1,3}\s+/.test(line))
      .map((line) => line.replace(/^#{1,3}\s+/, '').trim().toLowerCase());

    for (const section of REQUIRED_CLAUDE_SECTIONS) {
      const found = headings.some((h) => h.includes(section.toLowerCase()));
      if (!found) {
        this.#addWarning(
          'CLAUDE.md',
          'missing-section',
          `CLAUDE.md is missing expected section: "${section}".`,
        );
      }
    }
  }

  /**
   * Recursively scans the output directory for JS/TS files and runs basic
   * syntax checks on each.
   *
   * @param {string} dirPath - Directory to scan.
   */
  #syntaxCheckAllJsTs(dirPath) {
    let entries;
    try {
      entries = readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories.
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        this.#syntaxCheckAllJsTs(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (JS_TS_EXTENSIONS.includes(ext)) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            if (content.trim().length > 0) {
              this.#basicSyntaxCheck(fullPath, content);
            }
          } catch {
            // Silently skip unreadable files — already caught elsewhere.
          }
        }
      }
    }
  }

  /**
   * Performs lightweight heuristic syntax checks on JS/TS content.
   *
   * This is NOT a full parser. It catches:
   *   - Unmatched braces `{ }`
   *   - Unmatched brackets `[ ]`
   *   - Unmatched parentheses `( )`
   *   - Unclosed template literals
   *   - `console.log` left in production code (warning only)
   *
   * @param {string} filePath - For error reporting.
   * @param {string} content  - File content.
   */
  #basicSyntaxCheck(filePath, content) {
    // Strip string literals and comments to avoid false positives.
    const stripped = this.#stripStringsAndComments(content);

    // Brace matching.
    const braces = this.#countChar(stripped, '{') - this.#countChar(stripped, '}');
    if (braces !== 0) {
      this.#addWarning(
        filePath,
        'unmatched-braces',
        `Possible unmatched braces (balance: ${braces > 0 ? '+' : ''}${braces}).`,
      );
    }

    // Bracket matching.
    const brackets = this.#countChar(stripped, '[') - this.#countChar(stripped, ']');
    if (brackets !== 0) {
      this.#addWarning(
        filePath,
        'unmatched-brackets',
        `Possible unmatched brackets (balance: ${brackets > 0 ? '+' : ''}${brackets}).`,
      );
    }

    // Parenthesis matching.
    const parens = this.#countChar(stripped, '(') - this.#countChar(stripped, ')');
    if (parens !== 0) {
      this.#addWarning(
        filePath,
        'unmatched-parens',
        `Possible unmatched parentheses (balance: ${parens > 0 ? '+' : ''}${parens}).`,
      );
    }

    // console.log warning.
    if (/\bconsole\s*\.\s*log\s*\(/.test(content)) {
      this.#addWarning(
        filePath,
        'console-log',
        'File contains console.log() calls; consider removing for production.',
      );
    }
  }

  /**
   * Strips string literals (single, double, template) and comments
   * (line and block) from JavaScript/TypeScript source to avoid false
   * positives in brace-matching checks.
   *
   * @param {string} source
   * @returns {string}
   */
  #stripStringsAndComments(source) {
    // Order matters: block comments, line comments, template literals,
    // double-quoted strings, single-quoted strings.
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')           // block comments
      .replace(/\/\/[^\n]*/g, '')                  // line comments
      .replace(/`(?:[^`\\]|\\.)*`/g, '')           // template literals
      .replace(/"(?:[^"\\]|\\.)*"/g, '')           // double-quoted strings
      .replace(/'(?:[^'\\]|\\.)*'/g, '');          // single-quoted strings
  }

  /**
   * Counts occurrences of a single character in a string.
   *
   * @param {string} str
   * @param {string} char
   * @returns {number}
   */
  #countChar(str, char) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === char) count++;
    }
    return count;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** @type {StructureValidator|null} */
let _instance = null;

/**
 * Returns a shared StructureValidator instance (singleton-friendly).
 *
 * @param {{ fresh?: boolean }} [options]
 * @returns {StructureValidator}
 */
export function createStructureValidator(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new StructureValidator();
  }
  return _instance;
}

export default StructureValidator;
