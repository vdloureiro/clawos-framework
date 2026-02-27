/**
 * @module pipeline-executor
 * @description Executes the five-phase ClawOS generation pipeline sequentially,
 * providing hooks, error boundaries, dry-run support, and full observability
 * via events.
 *
 * The PipelineExecutor is the high-level "runner" that wires together the
 * MasterOrchestrator (state machine) and PhaseManager (definitions/validation)
 * into a single, easy-to-use execution flow.
 *
 * Usage:
 * ```js
 * import { PipelineExecutor } from './pipeline-executor.js';
 * import { createOrchestrator }  from './master-orchestrator.js';
 * import { createPhaseManager }  from './phase-manager.js';
 *
 * const executor = new PipelineExecutor({
 *   orchestrator: createOrchestrator(),
 *   phaseManager: createPhaseManager(),
 * });
 *
 * executor.before('DISCOVER', async (ctx) => { console.log('About to discover...'); });
 * executor.after('GENERATE',  async (ctx) => { console.log('Files generated!'); });
 *
 * const result = await executor.run({ userInput: 'Build me a React component library' });
 * ```
 */

import { EventEmitter } from 'node:events';
import {
  Phase,
  OrchestratorState,
  PHASE_ORDER,
  createPhaseManager,
} from './phase-manager.js';
import { createOrchestrator } from './master-orchestrator.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** High-resolution timestamp in milliseconds. */
const now = () => performance.now();

/**
 * Deep-clone a plain object via JSON round-trip.
 *
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function snapshot(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Invokes an array of async hook functions sequentially, passing `arg` to each.
 * If any hook throws, the error propagates immediately.
 *
 * @param {Array<(arg: unknown) => Promise<void>>} hooks
 * @param {unknown} arg
 */
async function runHooks(hooks, arg) {
  for (const hook of hooks) {
    await hook(arg);
  }
}

// ---------------------------------------------------------------------------
// PipelineExecutor
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PipelineResult
 * @property {boolean}  success          - Whether all phases completed.
 * @property {string}   runId            - The orchestrator run identifier.
 * @property {Record<string, unknown>} data - Accumulated context data.
 * @property {import('./master-orchestrator.js').PhaseTimingEntry[]} timing
 * @property {string[]} completedPhases
 * @property {string[]} skippedPhases
 * @property {number}   totalDurationMs
 * @property {Array<{ phase: string, message: string }>} errors
 * @property {boolean}  dryRun           - Whether this was a dry-run execution.
 */

/**
 * @typedef {Object} PhaseHookContext
 * @property {string}  phaseId   - The phase about to run (or just finished).
 * @property {string}  runId     - Current run identifier.
 * @property {Record<string, unknown>} data - Current accumulated context data.
 * @property {boolean} dryRun    - Whether this is a dry-run execution.
 */

/**
 * Orchestrates the full five-phase pipeline with hooks, error boundaries,
 * skip conditions, and dry-run capabilities.
 *
 * @extends EventEmitter
 *
 * @fires PipelineExecutor#pipeline:started
 * @fires PipelineExecutor#pipeline:completed
 * @fires PipelineExecutor#pipeline:failed
 * @fires PipelineExecutor#phase:before
 * @fires PipelineExecutor#phase:after
 * @fires PipelineExecutor#phase:skipped
 * @fires PipelineExecutor#phase:error
 * @fires PipelineExecutor#hook:error
 * @fires PipelineExecutor#dryrun:phase
 */
export class PipelineExecutor extends EventEmitter {
  /** @type {import('./master-orchestrator.js').MasterOrchestrator} */
  #orchestrator;

  /** @type {import('./phase-manager.js').PhaseManager} */
  #phaseManager;

  /**
   * Before-hooks keyed by phase id. '*' is the wildcard (runs for every phase).
   * @type {Map<string, Array<(ctx: PhaseHookContext) => Promise<void>>>}
   */
  #beforeHooks = new Map();

  /**
   * After-hooks keyed by phase id. '*' is the wildcard (runs for every phase).
   * @type {Map<string, Array<(ctx: PhaseHookContext) => Promise<void>>>}
   */
  #afterHooks = new Map();

  /**
   * Per-phase skip predicates. If any predicate returns true the phase is skipped.
   * @type {Map<string, Array<(ctx: Record<string, unknown>) => boolean>>}
   */
  #skipConditions = new Map();

  /**
   * Per-phase error boundary handlers. Receives the error and can decide to
   * swallow it (return truthy) or let it propagate (return falsy / throw).
   * @type {Map<string, (err: Error, ctx: PhaseHookContext) => boolean | Promise<boolean>>}
   */
  #errorBoundaries = new Map();

  /** @type {boolean} */
  #dryRun = false;

  /**
   * @param {Object} [options]
   * @param {import('./master-orchestrator.js').MasterOrchestrator} [options.orchestrator]
   * @param {import('./phase-manager.js').PhaseManager} [options.phaseManager]
   * @param {boolean} [options.dryRun=false] - When true, phases are simulated
   *   without invoking real handlers. Useful for previewing the pipeline.
   */
  constructor(options = {}) {
    super();
    this.#orchestrator = options.orchestrator ?? createOrchestrator({ fresh: true });
    this.#phaseManager = options.phaseManager ?? createPhaseManager();
    this.#dryRun = options.dryRun ?? false;
  }

  // -----------------------------------------------------------------------
  // Configuration API
  // -----------------------------------------------------------------------

  /**
   * Registers a before-hook for a specific phase (or '*' for all phases).
   * Hooks run in registration order before the phase handler executes.
   *
   * @param {string} phaseIdOrWildcard - Phase id or '*'.
   * @param {(ctx: PhaseHookContext) => Promise<void>} hook
   * @returns {this}
   */
  before(phaseIdOrWildcard, hook) {
    this.#validateHook('before', phaseIdOrWildcard, hook);
    const list = this.#beforeHooks.get(phaseIdOrWildcard) ?? [];
    list.push(hook);
    this.#beforeHooks.set(phaseIdOrWildcard, list);
    return this;
  }

  /**
   * Registers an after-hook for a specific phase (or '*' for all phases).
   * Hooks run in registration order after the phase handler completes.
   *
   * @param {string} phaseIdOrWildcard - Phase id or '*'.
   * @param {(ctx: PhaseHookContext) => Promise<void>} hook
   * @returns {this}
   */
  after(phaseIdOrWildcard, hook) {
    this.#validateHook('after', phaseIdOrWildcard, hook);
    const list = this.#afterHooks.get(phaseIdOrWildcard) ?? [];
    list.push(hook);
    this.#afterHooks.set(phaseIdOrWildcard, list);
    return this;
  }

  /**
   * Registers a skip condition for a phase. The phase is skipped if ANY
   * registered predicate returns true.
   *
   * @param {string} phaseId
   * @param {(ctx: Record<string, unknown>) => boolean} predicate
   * @returns {this}
   */
  skipWhen(phaseId, predicate) {
    if (phaseId !== '*') {
      this.#phaseManager.getDefinition(phaseId); // validates existence
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('[PipelineExecutor] Skip predicate must be a function.');
    }
    const list = this.#skipConditions.get(phaseId) ?? [];
    list.push(predicate);
    this.#skipConditions.set(phaseId, list);

    // Also register on the orchestrator so its internal logic respects skips.
    if (phaseId !== '*') {
      this.#orchestrator.registerSkipCondition(phaseId, predicate);
    }

    return this;
  }

  /**
   * Registers an error boundary for a phase. When the phase handler throws,
   * the boundary is invoked. If it returns `true`, the error is considered
   * handled and execution continues to the next phase. Otherwise, the error
   * propagates and the pipeline fails.
   *
   * @param {string} phaseId
   * @param {(err: Error, ctx: PhaseHookContext) => boolean | Promise<boolean>} handler
   * @returns {this}
   */
  onPhaseError(phaseId, handler) {
    this.#phaseManager.getDefinition(phaseId); // validates existence
    if (typeof handler !== 'function') {
      throw new TypeError('[PipelineExecutor] Error boundary handler must be a function.');
    }
    this.#errorBoundaries.set(phaseId, handler);
    return this;
  }

  /**
   * Registers a phase handler on the underlying orchestrator. Convenience
   * method so consumers do not need to interact with the orchestrator directly.
   *
   * @param {string} phaseId
   * @param {(ctx: Record<string, unknown>) => Promise<Record<string, unknown>>} handler
   * @returns {this}
   */
  registerHandler(phaseId, handler) {
    this.#orchestrator.registerPhaseHandler(phaseId, handler);
    return this;
  }

  /**
   * Toggles dry-run mode. In dry-run mode the pipeline simulates execution
   * without calling real phase handlers or writing any files.
   *
   * @param {boolean} enabled
   * @returns {this}
   */
  setDryRun(enabled) {
    this.#dryRun = Boolean(enabled);
    return this;
  }

  /** Whether dry-run mode is active. @returns {boolean} */
  get isDryRun() {
    return this.#dryRun;
  }

  /** The underlying orchestrator. */
  get orchestrator() {
    return this.#orchestrator;
  }

  /** The underlying phase manager. */
  get phaseManager() {
    return this.#phaseManager;
  }

  // -----------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------

  /**
   * Runs the full pipeline from start to finish.
   *
   * @param {Record<string, unknown>} initialData - Seed data (must include `userInput`).
   * @returns {Promise<PipelineResult>}
   */
  async run(initialData = {}) {
    const t0 = now();

    // Reset orchestrator for a clean run.
    this.#orchestrator.reset();

    this.emit('pipeline:started', {
      runId: this.#orchestrator.runId,
      dryRun: this.#dryRun,
      phases: PHASE_ORDER,
      timestamp: Date.now(),
    });

    /** @type {PipelineResult} */
    const result = {
      success: false,
      runId: this.#orchestrator.runId,
      data: {},
      timing: [],
      completedPhases: [],
      skippedPhases: [],
      totalDurationMs: 0,
      errors: [],
      dryRun: this.#dryRun,
    };

    if (this.#dryRun) {
      return this.#executeDryRun(initialData, result, t0);
    }

    try {
      // Wire up dry-run-safe handlers that respect before/after hooks and
      // error boundaries, then delegate to the orchestrator's start().
      this.#installHookWrappers();

      const ctx = await this.#orchestrator.start(initialData);

      result.success = true;
      result.data = ctx.data;
      result.timing = ctx.timing;
      result.completedPhases = ctx.completedPhases;
      result.skippedPhases = ctx.skippedPhases;
      result.runId = ctx.runId;
    } catch (err) {
      result.errors.push({
        phase: this.#orchestrator.currentPhase ?? 'unknown',
        message: err.message,
      });
    }

    result.totalDurationMs = Math.round((now() - t0) * 100) / 100;

    if (result.success) {
      this.emit('pipeline:completed', result);
    } else {
      this.emit('pipeline:failed', result);
    }

    return result;
  }

  /**
   * Resumes a previously failed pipeline, optionally injecting extra data.
   *
   * @param {Record<string, unknown>} [additionalData]
   * @returns {Promise<PipelineResult>}
   */
  async resume(additionalData = {}) {
    const resumeCheck = this.#orchestrator.canResume();
    if (!resumeCheck.canResume) {
      throw new Error(
        `[PipelineExecutor] Cannot resume: ${resumeCheck.reason}`,
      );
    }

    const t0 = now();

    /** @type {PipelineResult} */
    const result = {
      success: false,
      runId: this.#orchestrator.runId,
      data: {},
      timing: [],
      completedPhases: [],
      skippedPhases: [],
      totalDurationMs: 0,
      errors: [],
      dryRun: this.#dryRun,
    };

    try {
      this.#installHookWrappers();
      const ctx = await this.#orchestrator.resume(additionalData);

      result.success = true;
      result.data = ctx.data;
      result.timing = ctx.timing;
      result.completedPhases = ctx.completedPhases;
      result.skippedPhases = ctx.skippedPhases;
      result.runId = ctx.runId;
    } catch (err) {
      result.errors.push({
        phase: this.#orchestrator.currentPhase ?? 'unknown',
        message: err.message,
      });
    }

    result.totalDurationMs = Math.round((now() - t0) * 100) / 100;

    if (result.success) {
      this.emit('pipeline:completed', result);
    } else {
      this.emit('pipeline:failed', result);
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Private methods
  // -----------------------------------------------------------------------

  /**
   * Validates a hook registration call.
   *
   * @param {string} kind - 'before' or 'after'.
   * @param {string} phaseIdOrWildcard
   * @param {Function} hook
   */
  #validateHook(kind, phaseIdOrWildcard, hook) {
    if (phaseIdOrWildcard !== '*') {
      this.#phaseManager.getDefinition(phaseIdOrWildcard); // throws if invalid
    }
    if (typeof hook !== 'function') {
      throw new TypeError(
        `[PipelineExecutor] ${kind}-hook must be a function.`,
      );
    }
  }

  /**
   * Wraps each registered phase handler with before/after hooks and error
   * boundary logic. This is re-applied before every run to ensure the latest
   * hooks are in place.
   */
  #installHookWrappers() {
    for (const phaseId of PHASE_ORDER) {
      // Retrieve the original handler (if any) that was registered directly.
      // We need to be careful not to double-wrap on repeated runs.
      const originalKey = `__original_${phaseId}`;

      // Check if we already wrapped this handler.
      if (this.#orchestrator[originalKey]) {
        // Re-wrap from the original to pick up any new hooks.
        this.#wrapHandler(phaseId, this.#orchestrator[originalKey]);
        continue;
      }

      // Nothing to wrap if no handler registered yet — the orchestrator will
      // throw a clear error when it tries to execute.
    }
  }

  /**
   * Replaces the orchestrator's handler for `phaseId` with one that runs
   * before/after hooks and respects error boundaries.
   *
   * @param {string} phaseId
   * @param {(ctx: Record<string, unknown>) => Promise<Record<string, unknown>>} originalHandler
   */
  #wrapHandler(phaseId, originalHandler) {
    const self = this;

    this.#orchestrator.registerPhaseHandler(phaseId, async (data) => {
      const hookCtx = {
        phaseId,
        runId: self.#orchestrator.runId,
        data: snapshot(data),
        dryRun: self.#dryRun,
      };

      // --- Before hooks ---
      try {
        const wildcardBefore = self.#beforeHooks.get('*') ?? [];
        const phaseBefore = self.#beforeHooks.get(phaseId) ?? [];
        await runHooks([...wildcardBefore, ...phaseBefore], hookCtx);
      } catch (hookErr) {
        self.emit('hook:error', { kind: 'before', phaseId, error: hookErr });
        throw hookErr;
      }

      self.emit('phase:before', hookCtx);

      let output;
      try {
        output = await originalHandler(data);
      } catch (phaseErr) {
        // --- Error boundary ---
        const boundary = self.#errorBoundaries.get(phaseId);
        if (boundary) {
          const handled = await boundary(phaseErr, hookCtx);
          if (handled) {
            self.emit('phase:error', {
              phaseId,
              error: phaseErr,
              handled: true,
            });
            // Return an empty output so the pipeline can continue.
            // The boundary is responsible for injecting any required keys
            // into the context via the hookCtx.data if needed.
            return {};
          }
        }

        self.emit('phase:error', {
          phaseId,
          error: phaseErr,
          handled: false,
        });
        throw phaseErr;
      }

      // --- After hooks ---
      const afterHookCtx = {
        ...hookCtx,
        data: { ...hookCtx.data, ...output },
      };

      try {
        const wildcardAfter = self.#afterHooks.get('*') ?? [];
        const phaseAfter = self.#afterHooks.get(phaseId) ?? [];
        await runHooks([...wildcardAfter, ...phaseAfter], afterHookCtx);
      } catch (hookErr) {
        self.emit('hook:error', { kind: 'after', phaseId, error: hookErr });
        throw hookErr;
      }

      self.emit('phase:after', afterHookCtx);

      return output;
    });
  }

  /**
   * Executes a simulated dry-run. No real phase handlers are invoked. Instead,
   * each phase is evaluated for skip conditions and input validation, and
   * placeholder outputs are generated.
   *
   * @param {Record<string, unknown>} initialData
   * @param {PipelineResult} result
   * @param {number} t0
   * @returns {Promise<PipelineResult>}
   */
  async #executeDryRun(initialData, result, t0) {
    /** @type {Record<string, unknown>} */
    const accumulatedData = { ...initialData };

    for (const phaseId of PHASE_ORDER) {
      const definition = this.#phaseManager.getDefinition(phaseId);
      const phaseT0 = now();

      // --- Skip check ---
      const shouldSkip = this.#evaluateSkipConditions(phaseId, accumulatedData);
      if (shouldSkip) {
        result.skippedPhases.push(phaseId);
        result.timing.push({
          phase: phaseId,
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 0,
          status: 'skipped',
        });
        this.emit('dryrun:phase', { phaseId, action: 'skipped' });
        continue;
      }

      // --- Input validation ---
      const inputCheck = this.#phaseManager.validatePhaseInput(phaseId, accumulatedData);

      const hookCtx = {
        phaseId,
        runId: result.runId,
        data: snapshot(accumulatedData),
        dryRun: true,
      };

      // Run before hooks even in dry-run mode (they may perform logging, etc.).
      try {
        const wildcardBefore = this.#beforeHooks.get('*') ?? [];
        const phaseBefore = this.#beforeHooks.get(phaseId) ?? [];
        await runHooks([...wildcardBefore, ...phaseBefore], hookCtx);
      } catch { /* hooks are best-effort in dry-run */ }

      // Simulate output: create placeholder keys.
      const simulatedOutput = {};
      for (const key of definition.outputKeys) {
        simulatedOutput[key] = `[dry-run placeholder for ${key}]`;
      }
      Object.assign(accumulatedData, simulatedOutput);

      const durationMs = Math.round((now() - phaseT0) * 100) / 100;

      result.timing.push({
        phase: phaseId,
        startedAt: Date.now() - durationMs,
        endedAt: Date.now(),
        durationMs,
        status: inputCheck.valid ? 'simulated' : 'simulated-with-warnings',
      });

      if (!inputCheck.valid) {
        result.errors.push({
          phase: phaseId,
          message: `Missing required inputs: [${inputCheck.missing.join(', ')}]`,
        });
      }

      result.completedPhases.push(phaseId);

      // Run after hooks.
      try {
        const wildcardAfter = this.#afterHooks.get('*') ?? [];
        const phaseAfter = this.#afterHooks.get(phaseId) ?? [];
        await runHooks([...wildcardAfter, ...phaseAfter], {
          ...hookCtx,
          data: snapshot(accumulatedData),
        });
      } catch { /* hooks are best-effort in dry-run */ }

      this.emit('dryrun:phase', {
        phaseId,
        action: 'simulated',
        inputValid: inputCheck.valid,
        outputKeys: definition.outputKeys,
      });
    }

    result.success = result.errors.length === 0;
    result.data = accumulatedData;
    result.totalDurationMs = Math.round((now() - t0) * 100) / 100;

    this.emit('pipeline:completed', result);
    return result;
  }

  /**
   * Evaluates all skip conditions for a phase. Returns true if any predicate
   * returns true.
   *
   * @param {string} phaseId
   * @param {Record<string, unknown>} data
   * @returns {boolean}
   */
  #evaluateSkipConditions(phaseId, data) {
    const phasePredicates = this.#skipConditions.get(phaseId) ?? [];
    const wildcardPredicates = this.#skipConditions.get('*') ?? [];
    const allPredicates = [...wildcardPredicates, ...phasePredicates];

    return allPredicates.some((pred) => {
      try {
        return pred(data);
      } catch {
        return false;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** @type {PipelineExecutor|null} */
let _instance = null;

/**
 * Creates (or returns) a PipelineExecutor instance.
 *
 * @param {Object} [options]
 * @param {boolean} [options.fresh=false] - Force creation of a new instance.
 * @param {import('./master-orchestrator.js').MasterOrchestrator} [options.orchestrator]
 * @param {import('./phase-manager.js').PhaseManager} [options.phaseManager]
 * @param {boolean} [options.dryRun]
 * @returns {PipelineExecutor}
 */
export function createPipelineExecutor(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new PipelineExecutor(options);
  }
  return _instance;
}

export { Phase, OrchestratorState, PHASE_ORDER };
export default PipelineExecutor;
