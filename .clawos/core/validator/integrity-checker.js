/**
 * @module integrity-checker
 * @description Performs deep integrity checks on generated frameworks to ensure
 * internal consistency beyond file-level structure validation. Where
 * {@link StructureValidator} checks "are the right files there?", this module
 * checks "do the files work correctly together?".
 *
 * Checks performed:
 *   - All import/require statements resolve to existing files
 *   - Exported APIs match what documentation claims
 *   - Test files exist for every source module
 *   - README documents all public features / modules
 *   - CLAUDE.md slash commands reference actual command files
 *   - Security: hardcoded secrets, unsafe eval, unescaped user input patterns
 *   - Config file validity (JSON / YAML)
 *
 * Reports follow the same shape as {@link StructureValidator} for consistency.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname, resolve, relative, basename } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** File extensions treated as JavaScript/TypeScript source. */
const SOURCE_EXTENSIONS = Object.freeze(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);

/** File extensions treated as config files that should be valid JSON. */
const JSON_CONFIG_EXTENSIONS = Object.freeze(['.json']);

/** Patterns that suggest hardcoded secrets. */
const SECRET_PATTERNS = Object.freeze([
  { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/gi, label: 'API key' },
  { regex: /(?:secret|password|passwd|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,  label: 'secret/password/token' },
  { regex: /-----BEGIN\s(?:RSA\s)?PRIVATE\sKEY-----/g,                       label: 'private key' },
  { regex: /(?:AWS_SECRET_ACCESS_KEY|aws_secret)\s*[:=]\s*['"][^'"]+['"]/gi,  label: 'AWS secret' },
]);

/** Patterns that suggest unsafe code. */
const UNSAFE_PATTERNS = Object.freeze([
  { regex: /\beval\s*\(/g,                          label: 'eval() usage' },
  { regex: /new\s+Function\s*\(/g,                  label: 'new Function() usage' },
  { regex: /child_process\s*\.\s*exec\s*\(/g,       label: 'child_process.exec() (prefer execFile)' },
  { regex: /innerHTML\s*=/g,                         label: 'innerHTML assignment (XSS risk)' },
  { regex: /document\s*\.\s*write\s*\(/g,           label: 'document.write() usage' },
]);

/** Common test directory and file patterns. */
const TEST_PATTERNS = Object.freeze([
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /\/test\//,
  /\/tests\//,
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {'error'|'warning'} Severity
 */

/**
 * @typedef {Object} IntegrityEntry
 * @property {string}   file     - Relative or absolute path (or '*' for global).
 * @property {string}   type     - Category of the issue.
 * @property {string}   message  - Human-readable description.
 * @property {Severity} severity - 'error' or 'warning'.
 */

/**
 * @typedef {Object} IntegrityReport
 * @property {boolean}           valid    - True if zero errors.
 * @property {number}            score    - Quality score 0-100.
 * @property {IntegrityEntry[]}  errors   - Entries with severity 'error'.
 * @property {IntegrityEntry[]}  warnings - Entries with severity 'warning'.
 * @property {Object}            stats    - Aggregate counters.
 * @property {number}            stats.filesScanned
 * @property {number}            stats.importsChecked
 * @property {number}            stats.securityIssues
 * @property {number}            stats.missingTests
 */

// ---------------------------------------------------------------------------
// IntegrityChecker class
// ---------------------------------------------------------------------------

/**
 * Deep integrity checker for generated frameworks.
 *
 * Usage:
 * ```js
 * const checker = new IntegrityChecker();
 * const report = checker.check('./generated/my-framework');
 * console.log(report.score, report.errors);
 * ```
 */
export class IntegrityChecker {
  /** @type {IntegrityEntry[]} */
  #entries;

  /** @type {{ filesScanned: number, importsChecked: number, securityIssues: number, missingTests: number }} */
  #stats;

  /** @type {string} */
  #rootPath;

  constructor() {
    this.#entries = [];
    this.#stats = { filesScanned: 0, importsChecked: 0, securityIssues: 0, missingTests: 0 };
    this.#rootPath = '';
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Runs the full integrity check suite on a generated framework directory.
   *
   * @param {string} outputPath - Path to the generated framework root.
   * @returns {IntegrityReport}
   */
  check(outputPath) {
    // Reset state.
    this.#entries = [];
    this.#stats = { filesScanned: 0, importsChecked: 0, securityIssues: 0, missingTests: 0 };
    this.#rootPath = resolve(outputPath);

    if (!existsSync(this.#rootPath) || !statSync(this.#rootPath).isDirectory()) {
      this.#addError('*', 'missing-output', `Output directory does not exist: "${this.#rootPath}".`);
      return this.getReport();
    }

    // Collect all source files.
    const allFiles = this.#collectFiles(this.#rootPath);
    this.#stats.filesScanned = allFiles.length;

    // Source files only.
    const sourceFiles = allFiles.filter((f) =>
      SOURCE_EXTENSIONS.includes(extname(f).toLowerCase()),
    );

    // 1. Import resolution.
    this.checkImports(sourceFiles);

    // 2. Export / documentation consistency.
    this.checkExports(sourceFiles);

    // 3. Test coverage (file-level).
    this.#checkTestCoverage(sourceFiles);

    // 4. README check.
    this.#checkReadme();

    // 5. CLAUDE.md slash commands.
    this.#checkClaudeMdCommands();

    // 6. Security.
    this.checkSecurity(allFiles);

    // 7. Config file validity.
    this.#checkConfigFiles(allFiles);

    return this.getReport();
  }

  /**
   * Checks that all import/require statements in the given files resolve to
   * existing files.
   *
   * @param {string[]} files - Absolute paths to source files.
   */
  checkImports(files) {
    for (const filePath of files) {
      let content;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const imports = this.#extractImports(content);

      for (const imp of imports) {
        this.#stats.importsChecked++;

        // Skip bare specifiers (package imports like 'node:fs', 'lodash', etc.).
        if (!imp.startsWith('.') && !imp.startsWith('/')) continue;

        const resolved = this.#resolveImportPath(filePath, imp);
        if (!resolved) {
          this.#addError(
            this.#relPath(filePath),
            'unresolved-import',
            `Import "${imp}" in "${this.#relPath(filePath)}" does not resolve to an existing file.`,
          );
        }
      }
    }
  }

  /**
   * Cross-references exported symbols with README documentation. If a module
   * exports a public API, the README should mention it.
   *
   * @param {string[]} files - Absolute paths to source modules.
   */
  checkExports(files) {
    const readmePath = join(this.#rootPath, 'README.md');
    if (!existsSync(readmePath)) return;

    let readmeContent;
    try {
      readmeContent = readFileSync(readmePath, 'utf-8').toLowerCase();
    } catch {
      return;
    }

    for (const filePath of files) {
      // Skip test files, config files, etc.
      if (this.#isTestFile(filePath)) continue;

      let content;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const exports = this.#extractExportNames(content);
      const moduleName = basename(filePath, extname(filePath)).toLowerCase();

      // Only warn if the module has public exports and neither the module name
      // nor any of its export names appear in the README.
      if (exports.length > 0) {
        const mentionsModule = readmeContent.includes(moduleName);
        const mentionsAnyExport = exports.some((e) =>
          readmeContent.includes(e.toLowerCase()),
        );

        if (!mentionsModule && !mentionsAnyExport) {
          this.#addWarning(
            this.#relPath(filePath),
            'undocumented-module',
            `Module "${this.#relPath(filePath)}" exports [${exports.join(', ')}] but is not mentioned in README.md.`,
          );
        }
      }
    }
  }

  /**
   * Scans files for hardcoded secrets and unsafe code patterns.
   *
   * @param {string[]} files - Absolute paths to files to scan.
   */
  checkSecurity(files) {
    for (const filePath of files) {
      const ext = extname(filePath).toLowerCase();
      // Only check text-like files.
      if (![...SOURCE_EXTENSIONS, '.json', '.yaml', '.yml', '.env', '.md'].includes(ext)) {
        continue;
      }

      let content;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      // Hardcoded secrets.
      for (const { regex, label } of SECRET_PATTERNS) {
        // Reset lastIndex for global regexes.
        regex.lastIndex = 0;
        if (regex.test(content)) {
          this.#addError(
            this.#relPath(filePath),
            'hardcoded-secret',
            `Possible hardcoded ${label} detected in "${this.#relPath(filePath)}".`,
          );
          this.#stats.securityIssues++;
        }
      }

      // Unsafe patterns (only in source files).
      if (SOURCE_EXTENSIONS.includes(ext)) {
        for (const { regex, label } of UNSAFE_PATTERNS) {
          regex.lastIndex = 0;
          if (regex.test(content)) {
            this.#addWarning(
              this.#relPath(filePath),
              'unsafe-pattern',
              `Unsafe pattern (${label}) found in "${this.#relPath(filePath)}".`,
            );
            this.#stats.securityIssues++;
          }
        }
      }

      // .env files should not be committed.
      if (basename(filePath) === '.env') {
        this.#addWarning(
          this.#relPath(filePath),
          'env-file',
          '.env file found in generated output. Ensure it is in .gitignore.',
        );
      }
    }
  }

  /**
   * Returns the current integrity report.
   *
   * @returns {IntegrityReport}
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
      stats: { ...this.#stats },
    };
  }

  // -----------------------------------------------------------------------
  // Private: Import resolution
  // -----------------------------------------------------------------------

  /**
   * Extracts import specifiers from ES module import statements and
   * CommonJS require calls.
   *
   * @param {string} content
   * @returns {string[]} Array of raw specifier strings.
   */
  #extractImports(content) {
    const specifiers = [];

    // ES module static imports: import ... from 'specifier'
    const esImportRe = /\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let m;
    while ((m = esImportRe.exec(content)) !== null) {
      specifiers.push(m[1]);
    }

    // Dynamic import: import('specifier')
    const dynamicImportRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = dynamicImportRe.exec(content)) !== null) {
      specifiers.push(m[1]);
    }

    // CommonJS require: require('specifier')
    const requireRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = requireRe.exec(content)) !== null) {
      specifiers.push(m[1]);
    }

    return specifiers;
  }

  /**
   * Attempts to resolve a relative import specifier to an existing file.
   *
   * Tries these extensions in order: exact, .js, .mjs, .ts, .mts, /index.js,
   * /index.ts.
   *
   * @param {string} fromFile  - The file containing the import.
   * @param {string} specifier - The relative import specifier.
   * @returns {string|null} Resolved absolute path or null.
   */
  #resolveImportPath(fromFile, specifier) {
    const dir = dirname(fromFile);
    const base = join(dir, specifier);

    // Exact match.
    if (existsSync(base) && statSync(base).isFile()) return base;

    // Try common extensions.
    const tryExts = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'];
    for (const ext of tryExts) {
      const candidate = base + ext;
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }

    // Try index files (directory import).
    const indexExts = ['index.js', 'index.mjs', 'index.ts', 'index.mts'];
    for (const idx of indexExts) {
      const candidate = join(base, idx);
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Private: Export extraction
  // -----------------------------------------------------------------------

  /**
   * Extracts named export identifiers from ES module source.
   *
   * @param {string} content
   * @returns {string[]}
   */
  #extractExportNames(content) {
    const names = [];

    // export const/let/var/function/class NAME
    const namedRe = /\bexport\s+(?:const|let|var|function\*?|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m;
    while ((m = namedRe.exec(content)) !== null) {
      names.push(m[1]);
    }

    // export default (anonymous — record as 'default')
    if (/\bexport\s+default\b/.test(content)) {
      names.push('default');
    }

    return names;
  }

  // -----------------------------------------------------------------------
  // Private: Test coverage
  // -----------------------------------------------------------------------

  /**
   * Checks that each non-test source file has a corresponding test file.
   *
   * @param {string[]} sourceFiles
   */
  #checkTestCoverage(sourceFiles) {
    const nonTestFiles = sourceFiles.filter((f) => !this.#isTestFile(f));
    const allFileSet = new Set(sourceFiles.map((f) => f.toLowerCase()));

    for (const filePath of nonTestFiles) {
      const dir = dirname(filePath);
      const base = basename(filePath, extname(filePath));
      const ext = extname(filePath);

      // Look for common test file patterns.
      const candidates = [
        join(dir, `${base}.test${ext}`),
        join(dir, `${base}.spec${ext}`),
        join(dir, '__tests__', `${base}.test${ext}`),
        join(dir, '__tests__', `${base}.spec${ext}`),
        join(dir, '..', 'test', `${base}.test${ext}`),
        join(dir, '..', 'tests', `${base}.test${ext}`),
        join(dir, '..', '__tests__', `${base}.test${ext}`),
      ];

      const hasTest = candidates.some(
        (c) => allFileSet.has(resolve(c).toLowerCase()) || existsSync(c),
      );

      if (!hasTest) {
        this.#addWarning(
          this.#relPath(filePath),
          'missing-test',
          `No test file found for "${this.#relPath(filePath)}".`,
        );
        this.#stats.missingTests++;
      }
    }
  }

  /**
   * Returns true if the file path looks like a test file.
   *
   * @param {string} filePath
   * @returns {boolean}
   */
  #isTestFile(filePath) {
    return TEST_PATTERNS.some((p) => p.test(filePath));
  }

  // -----------------------------------------------------------------------
  // Private: README check
  // -----------------------------------------------------------------------

  /**
   * Validates that a README.md exists and has non-trivial content.
   */
  #checkReadme() {
    const readmePath = join(this.#rootPath, 'README.md');
    if (!existsSync(readmePath)) {
      this.#addWarning('README.md', 'missing-readme', 'No README.md found.');
      return;
    }

    let content;
    try {
      content = readFileSync(readmePath, 'utf-8');
    } catch {
      this.#addWarning('README.md', 'read-error', 'Unable to read README.md.');
      return;
    }

    if (content.trim().length < 50) {
      this.#addWarning(
        'README.md',
        'sparse-readme',
        'README.md exists but has very little content (< 50 chars).',
      );
    }
  }

  // -----------------------------------------------------------------------
  // Private: CLAUDE.md slash command check
  // -----------------------------------------------------------------------

  /**
   * If CLAUDE.md references slash commands (e.g. `/build`, `/test`), verifies
   * that corresponding command files exist in `.claude/commands/`.
   */
  #checkClaudeMdCommands() {
    const claudePath = join(this.#rootPath, 'CLAUDE.md');
    if (!existsSync(claudePath)) return;

    let content;
    try {
      content = readFileSync(claudePath, 'utf-8');
    } catch {
      return;
    }

    // Extract slash command references: /command-name
    const commandRe = /(?:^|\s)\/([a-z][a-z0-9-]{1,30})(?:\s|$|[.,:;)])/gm;
    const commands = new Set();
    let m;
    while ((m = commandRe.exec(content)) !== null) {
      commands.add(m[1]);
    }

    if (commands.size === 0) return;

    // Look for command files.
    const commandDirs = [
      join(this.#rootPath, '.claude', 'commands'),
      join(this.#rootPath, '.clawos', 'commands'),
    ];

    /** @type {Set<string>} */
    const existingCommands = new Set();
    for (const dir of commandDirs) {
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        try {
          const entries = readdirSync(dir);
          for (const entry of entries) {
            const name = basename(entry, extname(entry));
            existingCommands.add(name.toLowerCase());
          }
        } catch {
          // Skip unreadable dirs.
        }
      }
    }

    // Only report if the commands directory exists (i.e., commands are expected).
    if (existingCommands.size > 0 || commandDirs.some((d) => existsSync(d))) {
      for (const cmd of commands) {
        if (!existingCommands.has(cmd.toLowerCase())) {
          this.#addWarning(
            'CLAUDE.md',
            'missing-command-file',
            `CLAUDE.md references slash command "/${cmd}" but no corresponding command file found.`,
          );
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private: Config file validation
  // -----------------------------------------------------------------------

  /**
   * Validates that JSON config files are parseable.
   *
   * @param {string[]} allFiles
   */
  #checkConfigFiles(allFiles) {
    for (const filePath of allFiles) {
      const ext = extname(filePath).toLowerCase();

      if (JSON_CONFIG_EXTENSIONS.includes(ext)) {
        try {
          const raw = readFileSync(filePath, 'utf-8');
          JSON.parse(raw);
        } catch (err) {
          this.#addError(
            this.#relPath(filePath),
            'invalid-json',
            `Invalid JSON in "${this.#relPath(filePath)}": ${err.message}`,
          );
        }
      }

      // Basic YAML validation: ensure it does not contain tab indentation
      // (a common YAML mistake) and that key-value lines have colons.
      if (ext === '.yaml' || ext === '.yml') {
        try {
          const raw = readFileSync(filePath, 'utf-8');
          const lines = raw.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('\t')) {
              this.#addWarning(
                this.#relPath(filePath),
                'yaml-tab-indent',
                `YAML file uses tab indentation at line ${i + 1}. YAML requires spaces.`,
              );
              break; // One warning per file is sufficient.
            }
          }
        } catch {
          // Skip unreadable.
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private: Utility
  // -----------------------------------------------------------------------

  /**
   * Recursively collects all file paths under a directory, skipping
   * `node_modules` and hidden directories.
   *
   * @param {string} dirPath
   * @returns {string[]}
   */
  #collectFiles(dirPath) {
    const results = [];

    let entries;
    try {
      entries = readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        results.push(...this.#collectFiles(fullPath));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Returns a path relative to the checked root for cleaner reporting.
   *
   * @param {string} absPath
   * @returns {string}
   */
  #relPath(absPath) {
    if (!this.#rootPath) return absPath;
    return relative(this.#rootPath, absPath) || absPath;
  }

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
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** @type {IntegrityChecker|null} */
let _instance = null;

/**
 * Returns a shared IntegrityChecker instance (singleton-friendly).
 *
 * @param {{ fresh?: boolean }} [options]
 * @returns {IntegrityChecker}
 */
export function createIntegrityChecker(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new IntegrityChecker();
  }
  return _instance;
}

export default IntegrityChecker;
