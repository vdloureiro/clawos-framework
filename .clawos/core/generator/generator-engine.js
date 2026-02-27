/**
 * @fileoverview GeneratorEngine — Main code generation orchestrator for ClawOS.
 *
 * Coordinates the three specialised generators:
 *  - {@link FileGenerator}   — Physical file creation and rollback.
 *  - {@link CodeGenerator}   — Source code content production.
 *  - {@link ConfigGenerator} — Configuration file content production.
 *
 * Responsibilities:
 *  1. Accept a Blueprint and RequirementsProfile.
 *  2. Resolve module dependency order (topological sort).
 *  3. Orchestrate file generation in the correct sequence.
 *  4. Track progress and emit events via a lightweight event system.
 *  5. Handle file conflicts (skip, overwrite, merge).
 *  6. Support dry-run mode (return file map without writing to disk).
 *  7. Return a complete manifest of all generated files.
 *
 * @module generator/generator-engine
 * @author ClawOS Framework
 * @license MIT
 */

import path from 'node:path';
import { FileGenerator } from './file-generator.js';
import { CodeGenerator } from './code-generator.js';
import { ConfigGenerator } from './config-generator.js';

// =============================================================================
// Type definitions
// =============================================================================

/**
 * @typedef {Object} Blueprint
 * @property {string}  name               - Framework name.
 * @property {string}  [description]
 * @property {string}  [archetype]        - Architecture archetype.
 * @property {string}  [domain]           - Framework domain.
 * @property {BlueprintModule[]} modules  - Modules to generate.
 * @property {string[]} [features]        - Requested capabilities.
 * @property {Record<string, *>} [config] - Extra configuration data.
 */

/**
 * @typedef {Object} BlueprintModule
 * @property {string}   name            - Module name (PascalCase).
 * @property {string}   [description]
 * @property {string[]} [dependsOn]     - Names of modules this one depends on.
 * @property {string[]} [imports]
 * @property {string[]} [exports]
 * @property {import('./code-generator.js').MethodSpec[]} [methods]
 * @property {import('./code-generator.js').PropertySpec[]} [properties]
 * @property {boolean}  [isEntryPoint]
 * @property {boolean}  [hasTests]
 * @property {string}   [template]      - Code template name (e.g. "express-server").
 * @property {Record<string, *>} [templateVars] - Variables for the template.
 */

/**
 * @typedef {Object} RequirementsProfile
 * @property {string}  name
 * @property {string}  [description]
 * @property {string}  [version]
 * @property {string}  [author]
 * @property {string}  [license]
 * @property {string}  [domain]
 * @property {string}  [archetype]
 * @property {'javascript'|'typescript'|'python'} [language]
 * @property {string[]} [features]
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {number}  [port]
 * @property {string}  [nodeVersion]
 * @property {boolean} [useDocker]
 * @property {boolean} [useGitHubActions]
 * @property {boolean} [useTypescript]
 * @property {boolean} [usePrettier]
 * @property {boolean} [useEslint]
 * @property {string[]} [envVars]
 */

/**
 * @typedef {'skip'|'overwrite'|'merge'} ConflictStrategy
 */

/**
 * @typedef {Object} GenerationProgress
 * @property {number}  totalSteps     - Total generation steps.
 * @property {number}  completedSteps - Steps completed so far.
 * @property {string}  currentStep    - Description of the current step.
 * @property {number}  percentage     - 0-100 completion percentage.
 * @property {'idle'|'running'|'completed'|'failed'} status
 */

/**
 * @typedef {Object} GeneratedManifest
 * @property {string}   name            - Framework name.
 * @property {string}   outputPath      - Root output directory.
 * @property {string[]} files           - List of all generated file paths.
 * @property {string[]} directories     - List of all created directories.
 * @property {number}   totalFiles      - Count of generated files.
 * @property {number}   totalSize       - Approximate total bytes written.
 * @property {number}   duration        - Generation time in milliseconds.
 * @property {Date}     generatedAt     - Timestamp.
 * @property {boolean}  dryRun          - Whether this was a dry run.
 */

/**
 * @typedef {Object} DryRunResult
 * @property {Map<string, string>} fileMap - path -> content.
 * @property {GeneratedManifest}   manifest
 */

/**
 * @callback EventListener
 * @param {Object} payload
 */

// =============================================================================
// GeneratorEngine class
// =============================================================================

/**
 * GeneratorEngine orchestrates the full code generation pipeline.
 *
 * @example
 * ```js
 * const engine = new GeneratorEngine();
 *
 * // Full generation
 * const manifest = await engine.generate(blueprint, profile, './output');
 *
 * // Dry run
 * const { fileMap, manifest } = await engine.dryRun(blueprint, profile);
 * ```
 */
export class GeneratorEngine {
  /** @type {FileGenerator|null} */
  #fileGenerator = null;

  /** @type {CodeGenerator} */
  #codeGenerator;

  /** @type {ConfigGenerator} */
  #configGenerator;

  /** @type {GenerationProgress} */
  #progress;

  /** @type {Map<string, string>} path -> content (used in dry-run and tracking) */
  #generatedFiles = new Map();

  /** @type {Map<string, Set<EventListener>>} */
  #listeners = new Map();

  /** @type {ConflictStrategy} */
  #conflictStrategy;

  /**
   * Create a new GeneratorEngine.
   *
   * @param {Object} [options={}]
   * @param {ConflictStrategy} [options.conflictStrategy='overwrite']
   * @param {'javascript'|'typescript'|'python'} [options.language='javascript']
   */
  constructor(options = {}) {
    this.#conflictStrategy = options.conflictStrategy ?? 'overwrite';
    this.#codeGenerator = new CodeGenerator({ language: options.language ?? 'javascript' });
    this.#configGenerator = new ConfigGenerator();
    this.#progress = GeneratorEngine.#initialProgress();
  }

  // ---------------------------------------------------------------------------
  // Event system
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to a generation event.
   *
   * Events:
   *  - `progress`       — Fired after each step. Payload: {@link GenerationProgress}
   *  - `file:created`   — Fired after a file is written. Payload: { path, size }
   *  - `step:start`     — Fired before a step begins. Payload: { step }
   *  - `step:complete`  — Fired after a step completes. Payload: { step }
   *  - `conflict`       — Fired when a file conflict is detected. Payload: { path, strategy }
   *  - `error`          — Fired on error. Payload: { error, step }
   *  - `complete`       — Fired when generation finishes. Payload: {@link GeneratedManifest}
   *
   * @param {string}        event
   * @param {EventListener} listener
   * @returns {Function} Unsubscribe function.
   */
  on(event, listener) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(listener);
    return () => this.#listeners.get(event)?.delete(listener);
  }

  /**
   * Emit an event to all registered listeners.
   *
   * @param {string} event
   * @param {Object} payload
   */
  #emit(event, payload) {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch {
        // Listener errors must not break generation.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Generate a complete framework, writing files to disk.
   *
   * @param {Blueprint}           blueprint
   * @param {RequirementsProfile} profile
   * @param {string}              outputPath - Root directory to write into.
   * @returns {Promise<GeneratedManifest>}
   */
  async generate(blueprint, profile, outputPath) {
    const startTime = Date.now();
    const absoluteOutput = path.resolve(outputPath);

    this.#fileGenerator = new FileGenerator({ basePath: absoluteOutput });
    this.#generatedFiles.clear();
    this.#progress = GeneratorEngine.#initialProgress();
    this.#progress.status = 'running';

    // Merge profile into config generator.
    this.#configGenerator = new ConfigGenerator(profile);
    this.#codeGenerator = new CodeGenerator({ language: profile.language ?? 'javascript' });

    try {
      // Calculate total steps.
      const sortedModules = GeneratorEngine.#topologicalSort(blueprint.modules || []);
      const configFiles = this.#configGenerator.generateAll(profile);
      const testFiles = this.#codeGenerator.generateTests(sortedModules);

      // Steps: scaffold dirs + each module + entry point + package.json +
      //        README + each config + each test + CLAUDE.md
      this.#progress.totalSteps =
        1 +                         // scaffold
        sortedModules.length +      // modules
        1 +                         // entry point
        1 +                         // package.json
        1 +                         // README
        configFiles.length +        // config files
        testFiles.length +          // test files
        1;                          // CLAUDE.md stub

      // 1. Scaffold directory structure
      await this.#step('Scaffolding directory structure', async () => {
        await this.#scaffoldDirectories(absoluteOutput, profile);
      });

      // 2. Generate modules (in dependency order)
      for (const mod of sortedModules) {
        await this.#step(`Generating module: ${mod.name}`, async () => {
          await this.#generateModuleFile(mod, profile, absoluteOutput);
        });
      }

      // 3. Entry point
      await this.#step('Generating entry point', async () => {
        await this.#generateEntryPoint(sortedModules, profile, absoluteOutput);
      });

      // 4. package.json
      await this.#step('Generating package.json', async () => {
        const content = this.#codeGenerator.generatePackageJson({
          ...profile,
          modules: sortedModules,
        });
        await this.#writeFileWithConflictCheck(
          path.join(absoluteOutput, 'package.json'),
          content,
        );
      });

      // 5. README
      await this.#step('Generating README.md', async () => {
        const content = this.#codeGenerator.generateReadme({
          ...profile,
          modules: sortedModules,
        });
        await this.#writeFileWithConflictCheck(
          path.join(absoluteOutput, 'README.md'),
          content,
        );
      });

      // 6. Configuration files
      for (const cfg of configFiles) {
        await this.#step(`Generating config: ${cfg.path}`, async () => {
          await this.#writeFileWithConflictCheck(
            path.join(absoluteOutput, cfg.path),
            cfg.content,
          );
        });
      }

      // 7. Test files
      for (const test of testFiles) {
        await this.#step(`Generating test: ${test.path}`, async () => {
          await this.#writeFileWithConflictCheck(
            path.join(absoluteOutput, test.path),
            test.content,
          );
        });
      }

      // 8. CLAUDE.md stub
      await this.#step('Generating CLAUDE.md', async () => {
        const content = this.#generateClaudeMd(blueprint, profile);
        await this.#writeFileWithConflictCheck(
          path.join(absoluteOutput, 'CLAUDE.md'),
          content,
        );
      });

      // Build manifest
      const manifest = this.#buildManifest(
        blueprint.name || profile.name,
        absoluteOutput,
        startTime,
        false,
      );

      this.#progress.status = 'completed';
      this.#progress.percentage = 100;
      this.#emit('complete', manifest);

      return manifest;
    } catch (/** @type {*} */ error) {
      this.#progress.status = 'failed';
      this.#emit('error', { error, step: this.#progress.currentStep });

      // Attempt rollback
      if (this.#fileGenerator) {
        try {
          await this.#fileGenerator.rollback();
        } catch {
          // Best-effort rollback; swallow secondary errors.
        }
      }

      throw error;
    }
  }

  /**
   * Perform a dry run: generate all content but write nothing to disk.
   * Returns the full file map and manifest.
   *
   * @param {Blueprint}           blueprint
   * @param {RequirementsProfile} profile
   * @returns {Promise<DryRunResult>}
   */
  async dryRun(blueprint, profile) {
    const startTime = Date.now();
    const virtualOutput = path.resolve(profile.name || 'output');

    this.#fileGenerator = new FileGenerator({ basePath: virtualOutput, dryRun: true });
    this.#generatedFiles.clear();
    this.#configGenerator = new ConfigGenerator(profile);
    this.#codeGenerator = new CodeGenerator({ language: profile.language ?? 'javascript' });

    const sortedModules = GeneratorEngine.#topologicalSort(blueprint.modules || []);
    const adapter = this.#codeGenerator.getAdapter();

    // Generate module content
    for (const mod of sortedModules) {
      const kebab = GeneratorEngine.#toKebab(mod.name);
      const relPath = `src/core/${kebab}${adapter.extension}`;
      let content;

      if (mod.template) {
        content = this.#codeGenerator.getTemplate(mod.template, {
          name: mod.name,
          description: mod.description,
          ...(mod.templateVars || {}),
        });
      } else {
        content = this.#codeGenerator.generateModule(mod);
      }

      this.#generatedFiles.set(relPath, content);
    }

    // Entry point
    {
      const content = this.#codeGenerator.generateEntryPoint(sortedModules, {
        name: profile.name,
        description: profile.description,
        domain: profile.domain,
      });
      this.#generatedFiles.set(`src/index${adapter.extension}`, content);
    }

    // package.json
    {
      const content = this.#codeGenerator.generatePackageJson({
        ...profile,
        modules: sortedModules,
      });
      this.#generatedFiles.set('package.json', content);
    }

    // README
    {
      const content = this.#codeGenerator.generateReadme({
        ...profile,
        modules: sortedModules,
      });
      this.#generatedFiles.set('README.md', content);
    }

    // Config files
    const configFiles = this.#configGenerator.generateAll(profile);
    for (const cfg of configFiles) {
      this.#generatedFiles.set(cfg.path, cfg.content);
    }

    // Test files
    const testFiles = this.#codeGenerator.generateTests(sortedModules);
    for (const test of testFiles) {
      this.#generatedFiles.set(test.path, test.content);
    }

    // CLAUDE.md
    {
      const content = this.#generateClaudeMd(blueprint, profile);
      this.#generatedFiles.set('CLAUDE.md', content);
    }

    const manifest = this.#buildManifest(
      blueprint.name || profile.name,
      virtualOutput,
      startTime,
      true,
    );

    return {
      fileMap: new Map(this.#generatedFiles),
      manifest,
    };
  }

  /**
   * Get the current generation progress snapshot.
   *
   * @returns {Readonly<GenerationProgress>}
   */
  getProgress() {
    return Object.freeze({ ...this.#progress });
  }

  /**
   * Get an immutable copy of all generated file paths and their content.
   *
   * @returns {ReadonlyMap<string, string>}
   */
  getGeneratedFiles() {
    return new Map(this.#generatedFiles);
  }

  // ---------------------------------------------------------------------------
  // Private: step management
  // ---------------------------------------------------------------------------

  /**
   * Execute a named generation step, updating progress and emitting events.
   *
   * @param {string}              stepName
   * @param {() => Promise<void>} fn
   */
  async #step(stepName, fn) {
    this.#progress.currentStep = stepName;
    this.#emit('step:start', { step: stepName });

    await fn();

    this.#progress.completedSteps++;
    this.#progress.percentage = Math.round(
      (this.#progress.completedSteps / this.#progress.totalSteps) * 100,
    );
    this.#emit('step:complete', { step: stepName });
    this.#emit('progress', { ...this.#progress });
  }

  // ---------------------------------------------------------------------------
  // Private: file writing with conflict handling
  // ---------------------------------------------------------------------------

  /**
   * Write a file, handling conflicts according to the configured strategy.
   *
   * @param {string} absolutePath
   * @param {string} content
   */
  async #writeFileWithConflictCheck(absolutePath, content) {
    const exists = await this.#fileGenerator.exists(absolutePath);

    if (exists) {
      this.#emit('conflict', { path: absolutePath, strategy: this.#conflictStrategy });

      switch (this.#conflictStrategy) {
        case 'skip':
          return;

        case 'merge':
          // For merge strategy, append a section marker and new content.
          // In production this could invoke a real merge algorithm.
          {
            const separator = '\n\n// --- ClawOS Generated (merged) ---\n\n';
            const merged = content + separator;
            await this.#fileGenerator.writeFile(absolutePath, merged);
          }
          break;

        case 'overwrite':
        default:
          await this.#fileGenerator.writeFile(absolutePath, content);
          break;
      }
    } else {
      await this.#fileGenerator.writeFile(absolutePath, content);
    }

    // Track
    const basePath = this.#fileGenerator.resolve('');
    const relative = path.relative(basePath, absolutePath);
    this.#generatedFiles.set(relative, content);

    this.#emit('file:created', {
      path: absolutePath,
      size: Buffer.byteLength(content, 'utf-8'),
    });
  }

  // ---------------------------------------------------------------------------
  // Private: generation helpers
  // ---------------------------------------------------------------------------

  /**
   * Create the standard directory scaffold.
   *
   * @param {string}              outputPath
   * @param {RequirementsProfile} profile
   */
  async #scaffoldDirectories(outputPath, profile) {
    const dirs = [
      'src',
      'src/core',
      'src/utils',
      'tests',
      'docs',
    ];

    if (profile.domain === 'plugin') {
      dirs.push('src/plugins');
    }
    if (profile.useDocker) {
      dirs.push('.docker');
    }
    if (profile.useGitHubActions) {
      dirs.push('.github', '.github/workflows');
    }

    dirs.push('.claude', '.claude/commands');

    for (const dir of dirs) {
      await this.#fileGenerator.createDirectory(path.join(outputPath, dir));
    }
  }

  /**
   * Generate a single module file and write it.
   *
   * @param {BlueprintModule}     mod
   * @param {RequirementsProfile} profile
   * @param {string}              outputPath
   */
  async #generateModuleFile(mod, profile, outputPath) {
    const adapter = this.#codeGenerator.getAdapter();
    const kebab = GeneratorEngine.#toKebab(mod.name);
    const filePath = path.join(outputPath, 'src', 'core', `${kebab}${adapter.extension}`);

    let content;

    if (mod.template) {
      content = this.#codeGenerator.getTemplate(mod.template, {
        name: mod.name,
        description: mod.description,
        port: profile.port,
        version: profile.version,
        ...(mod.templateVars || {}),
      });
    } else {
      content = this.#codeGenerator.generateModule(mod, profile.language);
    }

    await this.#writeFileWithConflictCheck(filePath, content);
  }

  /**
   * Generate the main entry point.
   *
   * @param {BlueprintModule[]}   modules
   * @param {RequirementsProfile} profile
   * @param {string}              outputPath
   */
  async #generateEntryPoint(modules, profile, outputPath) {
    const adapter = this.#codeGenerator.getAdapter();
    const filePath = path.join(outputPath, 'src', `index${adapter.extension}`);
    const content = this.#codeGenerator.generateEntryPoint(modules, {
      name: profile.name,
      description: profile.description,
      domain: profile.domain,
    });
    await this.#writeFileWithConflictCheck(filePath, content);
  }

  /**
   * Generate a basic CLAUDE.md for the produced framework.
   *
   * @param {Blueprint}           blueprint
   * @param {RequirementsProfile} profile
   * @returns {string}
   */
  #generateClaudeMd(blueprint, profile) {
    const name = blueprint.name || profile.name || 'Framework';
    const modules = blueprint.modules || [];
    const lines = [];

    lines.push(`# ${name}`);
    lines.push('');
    if (profile.description) {
      lines.push(`> ${profile.description}`);
      lines.push('');
    }

    lines.push(`## Overview`);
    lines.push('');
    lines.push(`This framework was generated by **ClawOS**.`);
    lines.push('');

    if (profile.domain) {
      lines.push(`- **Domain**: ${profile.domain}`);
    }
    if (profile.archetype) {
      lines.push(`- **Archetype**: ${profile.archetype}`);
    }
    lines.push(`- **Language**: ${profile.language || 'javascript'}`);
    lines.push(`- **Version**: ${profile.version || '1.0.0'}`);
    lines.push('');

    if (modules.length) {
      lines.push(`## Modules`);
      lines.push('');
      for (const mod of modules) {
        lines.push(`- **${mod.name}** — ${mod.description || 'No description'}`);
      }
      lines.push('');
    }

    lines.push(`## Development`);
    lines.push('');
    lines.push('```bash');
    lines.push('npm install    # Install dependencies');
    lines.push('npm test       # Run tests');
    lines.push('npm start      # Start the framework');
    lines.push('```');
    lines.push('');

    lines.push(`## Behavioral Rules`);
    lines.push('');
    lines.push('- Read the source in `src/core/` to understand module implementations.');
    lines.push('- Run `npm test` after making changes.');
    lines.push('- Follow the existing code style and JSDoc conventions.');
    lines.push('');

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Private: manifest building
  // ---------------------------------------------------------------------------

  /**
   * Build a generation manifest from the current state.
   *
   * @param {string}  name
   * @param {string}  outputPath
   * @param {number}  startTime
   * @param {boolean} dryRun
   * @returns {GeneratedManifest}
   */
  #buildManifest(name, outputPath, startTime, dryRun) {
    const files = [...this.#generatedFiles.keys()];
    const directories = [...new Set(files.map((f) => path.dirname(f)))].sort();
    let totalSize = 0;
    for (const content of this.#generatedFiles.values()) {
      totalSize += Buffer.byteLength(content, 'utf-8');
    }

    return {
      name: name || 'unknown',
      outputPath,
      files,
      directories,
      totalFiles: files.length,
      totalSize,
      duration: Date.now() - startTime,
      generatedAt: new Date(),
      dryRun,
    };
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------

  /**
   * Return a fresh progress object in its initial state.
   *
   * @returns {GenerationProgress}
   */
  static #initialProgress() {
    return {
      totalSteps: 0,
      completedSteps: 0,
      currentStep: '',
      percentage: 0,
      status: 'idle',
    };
  }

  /**
   * Topologically sort modules so that dependencies come first.
   * Falls back to original order if no `dependsOn` fields are set.
   * Throws on circular dependencies.
   *
   * @param {BlueprintModule[]} modules
   * @returns {BlueprintModule[]}
   */
  static #topologicalSort(modules) {
    if (modules.length === 0) return [];

    /** @type {Map<string, BlueprintModule>} */
    const byName = new Map();
    for (const mod of modules) {
      byName.set(mod.name, mod);
    }

    /** @type {Map<string, 'unvisited'|'visiting'|'visited'>} */
    const state = new Map();
    for (const mod of modules) {
      state.set(mod.name, 'unvisited');
    }

    /** @type {BlueprintModule[]} */
    const sorted = [];

    /**
     * @param {string} name
     */
    function visit(name) {
      const s = state.get(name);
      if (s === 'visited') return;
      if (s === 'visiting') {
        throw new Error(`Circular dependency detected involving module "${name}".`);
      }

      state.set(name, 'visiting');

      const mod = byName.get(name);
      if (mod?.dependsOn) {
        for (const dep of mod.dependsOn) {
          if (byName.has(dep)) {
            visit(dep);
          }
        }
      }

      state.set(name, 'visited');
      if (mod) sorted.push(mod);
    }

    for (const mod of modules) {
      visit(mod.name);
    }

    return sorted;
  }

  /**
   * Convert a name to kebab-case.
   *
   * @param {string} name
   * @returns {string}
   */
  static #toKebab(name) {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
}

export default GeneratorEngine;
