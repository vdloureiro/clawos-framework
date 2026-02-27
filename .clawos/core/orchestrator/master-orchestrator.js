/**
 * @module master-orchestrator
 * @description Central state machine that drives the ClawOS framework generation
 * pipeline. It coordinates five sequential phases — DISCOVER, ELICIT, BLUEPRINT,
 * GENERATE, INTEGRATE — tracking context, timing metrics, and error recovery
 * throughout the entire lifecycle.
 *
 * Usage:
 * ```js
 * import { createOrchestrator } from './master-orchestrator.js';
 *
 * const orchestrator = createOrchestrator();
 * orchestrator.on('state:changed', ({ from, to }) => console.log(from, '->', to));
 *
 * await orchestrator.start({ userInput: 'Create a REST API framework for Node.js' });
 * ```
 */

import { EventEmitter } from 'node:events';
import {
  Phase,
  OrchestratorState,
  PHASE_ORDER,
  PHASE_TO_STATE,
  createPhaseManager,
} from './phase-manager.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** High-resolution timestamp in milliseconds. */
const now = () => performance.now();

/**
 * Produces a shallow snapshot of an object (one level deep clone).
 * Used to avoid leaking mutable internal references.
 *
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function snapshot(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generates a unique run identifier.
 *
 * @returns {string}
 */
function generateRunId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${ts}_${rand}`;
}

// ---------------------------------------------------------------------------
// MasterOrchestrator
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PhaseTimingEntry
 * @property {string}  phase     - Phase identifier.
 * @property {number}  startedAt - Timestamp (ms since epoch) when the phase began.
 * @property {number}  [endedAt] - Timestamp when the phase completed.
 * @property {number}  [durationMs] - Elapsed time in milliseconds.
 * @property {string}  status    - 'running' | 'completed' | 'failed' | 'skipped'
 * @property {string}  [error]   - Error message if the phase failed.
 */

/**
 * @typedef {Object} OrchestratorContext
 * @property {string}  runId           - Unique identifier for this pipeline run.
 * @property {string}  currentState    - Current {@link OrchestratorState}.
 * @property {string|null} currentPhase - Current {@link Phase} or null when idle.
 * @property {Record<string, unknown>} data - Accumulated context data across phases.
 * @property {PhaseTimingEntry[]} timing    - Timing entries per phase.
 * @property {string[]} completedPhases     - Phases that finished successfully.
 * @property {string[]} skippedPhases       - Phases that were skipped.
 * @property {Array<{ phase: string, error: Error, timestamp: number }>} errors
 *   - Error log with full Error objects.
 * @property {number}  startedAt       - Run start timestamp.
 * @property {number}  [completedAt]   - Run completion timestamp.
 * @property {number}  retryCount      - Number of error recoveries attempted.
 */

/**
 * The central state machine for ClawOS framework generation.
 *
 * @extends EventEmitter
 *
 * @fires MasterOrchestrator#state:changed
 * @fires MasterOrchestrator#phase:starting
 * @fires MasterOrchestrator#phase:completed
 * @fires MasterOrchestrator#phase:failed
 * @fires MasterOrchestrator#phase:skipped
 * @fires MasterOrchestrator#run:started
 * @fires MasterOrchestrator#run:completed
 * @fires MasterOrchestrator#run:failed
 * @fires MasterOrchestrator#error:recovered
 */
export class MasterOrchestrator extends EventEmitter {
  /** @type {import('./phase-manager.js').PhaseManager} */
  #phaseManager;

  /** @type {OrchestratorContext} */
  #context;

  /** @type {Map<string, (ctx: Record<string, unknown>) => Promise<Record<string, unknown>>>} */
  #phaseHandlers = new Map();

  /** @type {Map<string, (ctx: Record<string, unknown>) => boolean>} */
  #skipConditions = new Map();

  /** @type {number} */
  #maxRetries;

  /**
   * @param {Object} [options]
   * @param {import('./phase-manager.js').PhaseManager} [options.phaseManager]
   *   Custom PhaseManager instance. A default singleton is used if omitted.
   * @param {number} [options.maxRetries=3] Maximum error recovery attempts.
   */
  constructor(options = {}) {
    super();
    this.#phaseManager = options.phaseManager ?? createPhaseManager();
    this.#maxRetries = options.maxRetries ?? 3;
    this.#context = this.#createFreshContext();
  }

  // -----------------------------------------------------------------------
  // Read-only accessors
  // -----------------------------------------------------------------------

  /** Current orchestrator state. @returns {string} */
  get state() {
    return this.#context.currentState;
  }

  /** Current active phase or null. @returns {string|null} */
  get currentPhase() {
    return this.#context.currentPhase;
  }

  /** Unique run identifier. @returns {string} */
  get runId() {
    return this.#context.runId;
  }

  /** Full context snapshot (deep copy). @returns {OrchestratorContext} */
  get context() {
    return snapshot(this.#context);
  }

  /** Accumulated data across all phases. @returns {Record<string, unknown>} */
  get data() {
    return snapshot(this.#context.data);
  }

  /** Timing metrics for all phases. @returns {PhaseTimingEntry[]} */
  get timing() {
    return snapshot(this.#context.timing);
  }

  /** The PhaseManager instance used by this orchestrator. */
  get phaseManager() {
    return this.#phaseManager;
  }

  // -----------------------------------------------------------------------
  // Phase handler registration
  // -----------------------------------------------------------------------

  /**
   * Registers an async handler function for a specific phase. The handler
   * receives the current accumulated data and must return an object whose
   * keys match the phase's declared output contract.
   *
   * @param {string} phaseId - One of the {@link Phase} values.
   * @param {(ctx: Record<string, unknown>) => Promise<Record<string, unknown>>} handler
   * @returns {this}
   */
  registerPhaseHandler(phaseId, handler) {
    // Validate that the phase exists.
    this.#phaseManager.getDefinition(phaseId);

    if (typeof handler !== 'function') {
      throw new TypeError(`[MasterOrchestrator] Handler for "${phaseId}" must be a function.`);
    }
    this.#phaseHandlers.set(phaseId, handler);
    return this;
  }

  /**
   * Registers a skip condition for a phase. If the predicate returns true
   * when evaluated before the phase starts, the phase is skipped.
   *
   * @param {string} phaseId
   * @param {(ctx: Record<string, unknown>) => boolean} predicate
   * @returns {this}
   */
  registerSkipCondition(phaseId, predicate) {
    this.#phaseManager.getDefinition(phaseId);

    if (typeof predicate !== 'function') {
      throw new TypeError(`[MasterOrchestrator] Skip condition for "${phaseId}" must be a function.`);
    }
    this.#skipConditions.set(phaseId, predicate);
    return this;
  }

  // -----------------------------------------------------------------------
  // Lifecycle — start / resume / reset
  // -----------------------------------------------------------------------

  /**
   * Starts a fresh pipeline run with the given initial data.
   *
   * @param {Record<string, unknown>} initialData - Must at minimum contain `userInput`.
   * @returns {Promise<OrchestratorContext>} Final context after all phases complete.
   * @throws {Error} If the orchestrator is not in IDLE state.
   */
  async start(initialData = {}) {
    if (this.#context.currentState !== OrchestratorState.IDLE) {
      throw new Error(
        `[MasterOrchestrator] Cannot start: current state is "${this.#context.currentState}". ` +
        'Call reset() first or use resume().',
      );
    }

    this.#context = this.#createFreshContext();
    Object.assign(this.#context.data, initialData);

    this.emit('run:started', {
      runId: this.#context.runId,
      timestamp: this.#context.startedAt,
    });

    try {
      await this.#executePipeline();
    } catch (err) {
      this.#transitionTo(OrchestratorState.ERROR);
      this.emit('run:failed', {
        runId: this.#context.runId,
        error: err,
        context: this.context,
      });
      throw err;
    }

    return this.context;
  }

  /**
   * Resumes pipeline execution from the current phase (useful after error
   * recovery). Merges optional additional data into the context before
   * continuing.
   *
   * @param {Record<string, unknown>} [additionalData={}]
   * @returns {Promise<OrchestratorContext>}
   * @throws {Error} If the orchestrator is in IDLE or COMPLETE state.
   */
  async resume(additionalData = {}) {
    const { currentState } = this.#context;

    if (currentState === OrchestratorState.IDLE) {
      throw new Error('[MasterOrchestrator] Nothing to resume. Call start() instead.');
    }
    if (currentState === OrchestratorState.COMPLETE) {
      throw new Error('[MasterOrchestrator] Pipeline already complete. Call reset() to run again.');
    }

    Object.assign(this.#context.data, additionalData);
    this.#context.retryCount += 1;

    this.emit('error:recovered', {
      runId: this.#context.runId,
      retryCount: this.#context.retryCount,
      resumePhase: this.#context.currentPhase,
    });

    try {
      await this.#executePipeline(this.#context.currentPhase);
    } catch (err) {
      this.#transitionTo(OrchestratorState.ERROR);
      this.emit('run:failed', {
        runId: this.#context.runId,
        error: err,
        context: this.context,
      });
      throw err;
    }

    return this.context;
  }

  /**
   * Resets the orchestrator to IDLE so a new run can begin. Optionally
   * preserves accumulated data for inspection.
   *
   * @param {{ preserveData?: boolean }} [options]
   * @returns {this}
   */
  reset(options = {}) {
    const previousContext = this.context;
    this.#context = this.#createFreshContext();

    if (options.preserveData && previousContext.data) {
      this.#context.data = previousContext.data;
    }

    this.emit('state:changed', {
      from: previousContext.currentState,
      to: OrchestratorState.IDLE,
      runId: this.#context.runId,
    });

    return this;
  }

  // -----------------------------------------------------------------------
  // Individual phase transitions (public API for fine-grained control)
  // -----------------------------------------------------------------------

  /**
   * Executes a single named phase, validating inputs/outputs and recording
   * timing metrics. Primarily used internally but exposed for advanced
   * scenarios (e.g., re-running a single phase).
   *
   * @param {string} phaseId
   * @returns {Promise<Record<string, unknown>>} The phase output.
   */
  async executePhase(phaseId) {
    const definition = this.#phaseManager.getDefinition(phaseId);
    const targetState = definition.state;

    // --- Skip condition check ---
    const skipFn = this.#skipConditions.get(phaseId);
    if (skipFn && skipFn(this.#context.data)) {
      this.#context.skippedPhases.push(phaseId);
      this.#context.timing.push({
        phase: phaseId,
        startedAt: Date.now(),
        endedAt: Date.now(),
        durationMs: 0,
        status: 'skipped',
      });
      this.emit('phase:skipped', { phaseId, runId: this.#context.runId });
      return {};
    }

    // --- Input validation ---
    const inputResult = this.#phaseManager.validatePhaseInput(phaseId, this.#context.data);
    if (!inputResult.valid) {
      const err = new Error(
        `[MasterOrchestrator] Phase "${phaseId}" is missing required inputs: ` +
        `[${inputResult.missing.join(', ')}]`,
      );
      err.code = 'PHASE_INPUT_INVALID';
      err.phaseId = phaseId;
      err.missing = inputResult.missing;
      throw err;
    }

    // --- Transition state ---
    this.#transitionTo(targetState);
    this.#context.currentPhase = phaseId;

    const timingEntry = {
      phase: phaseId,
      startedAt: Date.now(),
      status: 'running',
    };
    this.#context.timing.push(timingEntry);

    this.emit('phase:starting', {
      phaseId,
      runId: this.#context.runId,
      inputKeys: Object.keys(this.#context.data),
    });

    const t0 = now();

    try {
      // --- Execute handler ---
      const handler = this.#phaseHandlers.get(phaseId);
      if (!handler) {
        throw new Error(
          `[MasterOrchestrator] No handler registered for phase "${phaseId}". ` +
          'Register one with orchestrator.registerPhaseHandler().',
        );
      }

      const output = await handler(snapshot(this.#context.data));

      // --- Output validation ---
      const outputResult = this.#phaseManager.validatePhaseOutput(phaseId, output);
      if (!outputResult.valid) {
        const err = new Error(
          `[MasterOrchestrator] Phase "${phaseId}" handler did not produce required outputs: ` +
          `[${outputResult.missing.join(', ')}]`,
        );
        err.code = 'PHASE_OUTPUT_INVALID';
        err.phaseId = phaseId;
        err.missing = outputResult.missing;
        throw err;
      }

      // --- Merge output into context ---
      Object.assign(this.#context.data, output);

      // --- Record success ---
      const durationMs = now() - t0;
      Object.assign(timingEntry, {
        endedAt: Date.now(),
        durationMs: Math.round(durationMs * 100) / 100,
        status: 'completed',
      });

      this.#context.completedPhases.push(phaseId);

      this.emit('phase:completed', {
        phaseId,
        runId: this.#context.runId,
        durationMs: timingEntry.durationMs,
        outputKeys: Object.keys(output),
      });

      return output;
    } catch (err) {
      // --- Record failure ---
      const durationMs = now() - t0;
      Object.assign(timingEntry, {
        endedAt: Date.now(),
        durationMs: Math.round(durationMs * 100) / 100,
        status: 'failed',
        error: err.message,
      });

      this.#context.errors.push({
        phase: phaseId,
        error: err,
        timestamp: Date.now(),
      });

      this.emit('phase:failed', {
        phaseId,
        runId: this.#context.runId,
        error: err,
        durationMs: timingEntry.durationMs,
      });

      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Metrics & introspection
  // -----------------------------------------------------------------------

  /**
   * Returns a summary of timing metrics for the current (or most recent) run.
   *
   * @returns {{
   *   runId: string,
   *   totalDurationMs: number,
   *   phases: PhaseTimingEntry[],
   *   completedPhases: string[],
   *   skippedPhases: string[],
   *   errorCount: number
   * }}
   */
  getMetrics() {
    const phases = this.#context.timing;
    const totalDurationMs = phases.reduce((sum, p) => sum + (p.durationMs ?? 0), 0);

    return {
      runId: this.#context.runId,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100,
      phases: snapshot(phases),
      completedPhases: [...this.#context.completedPhases],
      skippedPhases: [...this.#context.skippedPhases],
      errorCount: this.#context.errors.length,
    };
  }

  /**
   * Returns the error log for the current run.
   *
   * @returns {Array<{ phase: string, message: string, timestamp: number }>}
   */
  getErrors() {
    return this.#context.errors.map((e) => ({
      phase: e.phase,
      message: e.error?.message ?? String(e.error),
      timestamp: e.timestamp,
    }));
  }

  /**
   * Checks whether the pipeline can be resumed from its current position.
   *
   * @returns {{ canResume: boolean, reason?: string }}
   */
  canResume() {
    const { currentState, retryCount } = this.#context;

    if (currentState === OrchestratorState.IDLE) {
      return { canResume: false, reason: 'Pipeline has not been started.' };
    }
    if (currentState === OrchestratorState.COMPLETE) {
      return { canResume: false, reason: 'Pipeline already completed successfully.' };
    }
    if (retryCount >= this.#maxRetries) {
      return {
        canResume: false,
        reason: `Maximum retry count (${this.#maxRetries}) exceeded.`,
      };
    }

    return { canResume: true };
  }

  // -----------------------------------------------------------------------
  // Private methods
  // -----------------------------------------------------------------------

  /**
   * Creates a blank context for a new run.
   *
   * @returns {OrchestratorContext}
   */
  #createFreshContext() {
    return {
      runId: generateRunId(),
      currentState: OrchestratorState.IDLE,
      currentPhase: null,
      data: {},
      timing: [],
      completedPhases: [],
      skippedPhases: [],
      errors: [],
      startedAt: Date.now(),
      completedAt: null,
      retryCount: 0,
    };
  }

  /**
   * Validates and performs a state transition.
   *
   * @param {string} targetState
   * @throws {Error} If the transition is not valid.
   */
  #transitionTo(targetState) {
    const fromState = this.#context.currentState;

    const result = this.#phaseManager.validateTransition(fromState, targetState);
    if (!result.valid) {
      const err = new Error(
        `[MasterOrchestrator] Invalid state transition: ${result.reason}`,
      );
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    this.#context.currentState = targetState;

    this.emit('state:changed', {
      from: fromState,
      to: targetState,
      runId: this.#context.runId,
      timestamp: Date.now(),
    });
  }

  /**
   * Executes the pipeline from a given starting phase (or from the beginning).
   *
   * @param {string} [startFrom] - Phase to start from. If omitted, starts from
   *   the first phase.
   */
  async #executePipeline(startFrom) {
    let startIndex = 0;

    if (startFrom) {
      const def = this.#phaseManager.getDefinition(startFrom);
      startIndex = def.order;
    }

    for (let i = startIndex; i < PHASE_ORDER.length; i++) {
      const phaseId = PHASE_ORDER[i];

      // Skip already-completed phases (relevant when resuming).
      if (this.#context.completedPhases.includes(phaseId)) {
        continue;
      }

      await this.executePhase(phaseId);
    }

    // --- Validation state ---
    this.#transitionTo(OrchestratorState.VALIDATING);

    // Run a final validation pass: ensure all output keys from all phases exist.
    for (const phaseId of this.#context.completedPhases) {
      const outputCheck = this.#phaseManager.validatePhaseOutput(
        phaseId,
        this.#context.data,
      );
      if (!outputCheck.valid) {
        const err = new Error(
          `[MasterOrchestrator] Post-run validation failed: phase "${phaseId}" ` +
          `is missing outputs [${outputCheck.missing.join(', ')}] from context.`,
        );
        err.code = 'VALIDATION_FAILED';
        throw err;
      }
    }

    // --- Complete ---
    this.#transitionTo(OrchestratorState.COMPLETE);
    this.#context.completedAt = Date.now();

    this.emit('run:completed', {
      runId: this.#context.runId,
      metrics: this.getMetrics(),
      context: this.context,
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** @type {MasterOrchestrator|null} */
let _instance = null;

/**
 * Creates (or returns) a MasterOrchestrator instance.
 *
 * @param {Object} [options]
 * @param {boolean} [options.fresh=false] - Force creation of a new instance.
 * @param {import('./phase-manager.js').PhaseManager} [options.phaseManager]
 * @param {number} [options.maxRetries]
 * @returns {MasterOrchestrator}
 */
export function createOrchestrator(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new MasterOrchestrator(options);
  }
  return _instance;
}

export { Phase, OrchestratorState, PHASE_ORDER };
export default MasterOrchestrator;
