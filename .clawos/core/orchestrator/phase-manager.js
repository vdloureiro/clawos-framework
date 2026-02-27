/**
 * @module phase-manager
 * @description Manages phase definitions, transitions, and validation for the
 * ClawOS framework generation pipeline. Each phase has declared input requirements,
 * output contracts, and transition rules that the orchestrator enforces.
 *
 * The five core phases are:
 *   1. DISCOVER  - Parse user input, detect domain
 *   2. ELICIT    - Ask domain-specific questions
 *   3. BLUEPRINT - Select architecture patterns
 *   4. GENERATE  - Create all files
 *   5. INTEGRATE - Setup Claude Code integration
 */

import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical phase identifiers in pipeline order.
 * @readonly
 * @enum {string}
 */
export const Phase = Object.freeze({
  DISCOVER:  'DISCOVER',
  ELICIT:    'ELICIT',
  BLUEPRINT: 'BLUEPRINT',
  GENERATE:  'GENERATE',
  INTEGRATE: 'INTEGRATE',
});

/**
 * Orchestrator-level states (superset of phases — includes bookkeeping states).
 * @readonly
 * @enum {string}
 */
export const OrchestratorState = Object.freeze({
  IDLE:          'IDLE',
  DISCOVERING:   'DISCOVERING',
  ELICITING:     'ELICITING',
  BLUEPRINTING:  'BLUEPRINTING',
  GENERATING:    'GENERATING',
  INTEGRATING:   'INTEGRATING',
  VALIDATING:    'VALIDATING',
  COMPLETE:      'COMPLETE',
  ERROR:         'ERROR',
});

/**
 * Maps each phase to the orchestrator state that represents it being active.
 * @type {Record<string, string>}
 */
export const PHASE_TO_STATE = Object.freeze({
  [Phase.DISCOVER]:  OrchestratorState.DISCOVERING,
  [Phase.ELICIT]:    OrchestratorState.ELICITING,
  [Phase.BLUEPRINT]: OrchestratorState.BLUEPRINTING,
  [Phase.GENERATE]:  OrchestratorState.GENERATING,
  [Phase.INTEGRATE]: OrchestratorState.INTEGRATING,
});

/** Ordered list of phases for sequential iteration. */
export const PHASE_ORDER = Object.freeze([
  Phase.DISCOVER,
  Phase.ELICIT,
  Phase.BLUEPRINT,
  Phase.GENERATE,
  Phase.INTEGRATE,
]);

// ---------------------------------------------------------------------------
// Phase Definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PhaseDefinition
 * @property {string}   id          - Unique phase identifier (matches Phase enum).
 * @property {string}   label       - Human-readable name.
 * @property {string}   description - What this phase accomplishes.
 * @property {string}   state       - Corresponding OrchestratorState while running.
 * @property {string[]} requiredInputKeys  - Context keys that MUST be present before
 *                                           the phase can start.
 * @property {string[]} optionalInputKeys  - Context keys that MAY be present and will
 *                                           be used if available.
 * @property {string[]} outputKeys         - Context keys that the phase MUST produce.
 * @property {string[]} allowedPreviousStates - OrchestratorStates from which this
 *                                              phase can be entered.
 * @property {number}   order       - Zero-based execution order.
 */

/** @type {Record<string, PhaseDefinition>} */
const PHASE_DEFINITIONS = Object.freeze({
  [Phase.DISCOVER]: {
    id: Phase.DISCOVER,
    label: 'Discovery',
    description:
      'Parses raw user input to detect the target domain, initial constraints, ' +
      'and high-level requirements for the framework to be generated.',
    state: OrchestratorState.DISCOVERING,
    requiredInputKeys: ['userInput'],
    optionalInputKeys: ['hints', 'previousAttempt'],
    outputKeys: ['domain', 'constraints', 'requirements', 'detectedPatterns'],
    allowedPreviousStates: [OrchestratorState.IDLE, OrchestratorState.ERROR],
    order: 0,
  },

  [Phase.ELICIT]: {
    id: Phase.ELICIT,
    label: 'Elicitation',
    description:
      'Generates and poses domain-specific questions to the user in order to ' +
      'refine requirements, resolve ambiguities, and gather preferences.',
    state: OrchestratorState.ELICITING,
    requiredInputKeys: ['domain', 'requirements'],
    optionalInputKeys: ['constraints', 'detectedPatterns'],
    outputKeys: ['refinedRequirements', 'userPreferences', 'clarifications'],
    allowedPreviousStates: [OrchestratorState.DISCOVERING, OrchestratorState.ERROR],
    order: 1,
  },

  [Phase.BLUEPRINT]: {
    id: Phase.BLUEPRINT,
    label: 'Blueprinting',
    description:
      'Selects architecture patterns, directory structures, dependency graphs, ' +
      'and configuration templates based on refined requirements.',
    state: OrchestratorState.BLUEPRINTING,
    requiredInputKeys: ['domain', 'refinedRequirements', 'userPreferences'],
    optionalInputKeys: ['constraints', 'detectedPatterns', 'clarifications'],
    outputKeys: [
      'architecturePattern',
      'directoryStructure',
      'dependencyGraph',
      'configTemplates',
      'fileManifest',
    ],
    allowedPreviousStates: [OrchestratorState.ELICITING, OrchestratorState.ERROR],
    order: 2,
  },

  [Phase.GENERATE]: {
    id: Phase.GENERATE,
    label: 'Generation',
    description:
      'Creates every file declared in the blueprint — source code, configs, ' +
      'tests, documentation — writing them to the target directory.',
    state: OrchestratorState.GENERATING,
    requiredInputKeys: [
      'architecturePattern',
      'directoryStructure',
      'fileManifest',
      'configTemplates',
    ],
    optionalInputKeys: ['dependencyGraph', 'userPreferences'],
    outputKeys: ['generatedFiles', 'generationReport'],
    allowedPreviousStates: [OrchestratorState.BLUEPRINTING, OrchestratorState.ERROR],
    order: 3,
  },

  [Phase.INTEGRATE]: {
    id: Phase.INTEGRATE,
    label: 'Integration',
    description:
      'Wires up Claude Code integration — CLAUDE.md instructions, MCP configs, ' +
      'slash commands, and any post-generation hooks.',
    state: OrchestratorState.INTEGRATING,
    requiredInputKeys: ['generatedFiles', 'generationReport'],
    optionalInputKeys: [
      'architecturePattern',
      'directoryStructure',
      'userPreferences',
    ],
    outputKeys: ['integrationManifest', 'claudeConfig', 'finalReport'],
    allowedPreviousStates: [OrchestratorState.GENERATING, OrchestratorState.ERROR],
    order: 4,
  },
});

// ---------------------------------------------------------------------------
// Transition matrix  (from -> [to, ...])
// ---------------------------------------------------------------------------

/** @type {Record<string, string[]>} */
const VALID_TRANSITIONS = Object.freeze({
  [OrchestratorState.IDLE]:         [OrchestratorState.DISCOVERING, OrchestratorState.ERROR],
  [OrchestratorState.DISCOVERING]:  [OrchestratorState.ELICITING, OrchestratorState.VALIDATING, OrchestratorState.ERROR],
  [OrchestratorState.ELICITING]:    [OrchestratorState.BLUEPRINTING, OrchestratorState.VALIDATING, OrchestratorState.ERROR],
  [OrchestratorState.BLUEPRINTING]: [OrchestratorState.GENERATING, OrchestratorState.VALIDATING, OrchestratorState.ERROR],
  [OrchestratorState.GENERATING]:   [OrchestratorState.INTEGRATING, OrchestratorState.VALIDATING, OrchestratorState.ERROR],
  [OrchestratorState.INTEGRATING]:  [OrchestratorState.VALIDATING, OrchestratorState.COMPLETE, OrchestratorState.ERROR],
  [OrchestratorState.VALIDATING]:   [
    // After validation, can proceed to the next phase or loop back for retry.
    OrchestratorState.DISCOVERING,
    OrchestratorState.ELICITING,
    OrchestratorState.BLUEPRINTING,
    OrchestratorState.GENERATING,
    OrchestratorState.INTEGRATING,
    OrchestratorState.COMPLETE,
    OrchestratorState.ERROR,
  ],
  [OrchestratorState.ERROR]: [
    // From error, can retry any phase or reset to idle.
    OrchestratorState.IDLE,
    OrchestratorState.DISCOVERING,
    OrchestratorState.ELICITING,
    OrchestratorState.BLUEPRINTING,
    OrchestratorState.GENERATING,
    OrchestratorState.INTEGRATING,
  ],
  [OrchestratorState.COMPLETE]: [OrchestratorState.IDLE],
});

// ---------------------------------------------------------------------------
// PhaseManager class
// ---------------------------------------------------------------------------

/**
 * Manages phase definitions, validates transitions, and exposes phase metadata
 * for the orchestrator and pipeline executor.
 *
 * @extends EventEmitter
 *
 * @fires PhaseManager#transition:validated
 * @fires PhaseManager#transition:rejected
 * @fires PhaseManager#input:validated
 * @fires PhaseManager#input:missing
 * @fires PhaseManager#output:validated
 * @fires PhaseManager#output:missing
 */
export class PhaseManager extends EventEmitter {
  /** @type {Record<string, PhaseDefinition>} */
  #definitions;

  /** @type {Record<string, string[]>} */
  #transitions;

  constructor() {
    super();
    // Deep-clone so consumers cannot mutate internal state.
    this.#definitions = JSON.parse(JSON.stringify(PHASE_DEFINITIONS));
    this.#transitions = JSON.parse(JSON.stringify(VALID_TRANSITIONS));
  }

  // -----------------------------------------------------------------------
  // Phase metadata
  // -----------------------------------------------------------------------

  /**
   * Returns the full definition for a given phase.
   *
   * @param {string} phaseId - One of the {@link Phase} enum values.
   * @returns {PhaseDefinition}
   * @throws {Error} If phaseId is not a known phase.
   */
  getDefinition(phaseId) {
    const def = this.#definitions[phaseId];
    if (!def) {
      throw new Error(`[PhaseManager] Unknown phase: "${phaseId}"`);
    }
    // Return a copy to prevent external mutation.
    return { ...def };
  }

  /**
   * Returns all phase definitions keyed by phase id.
   *
   * @returns {Record<string, PhaseDefinition>}
   */
  getAllDefinitions() {
    return Object.fromEntries(
      Object.entries(this.#definitions).map(([k, v]) => [k, { ...v }]),
    );
  }

  /**
   * Returns phase definitions in pipeline execution order.
   *
   * @returns {PhaseDefinition[]}
   */
  getOrderedDefinitions() {
    return PHASE_ORDER.map((id) => this.getDefinition(id));
  }

  /**
   * Returns the OrchestratorState that corresponds to a given phase being active.
   *
   * @param {string} phaseId
   * @returns {string}
   */
  getStateForPhase(phaseId) {
    const def = this.getDefinition(phaseId);
    return def.state;
  }

  /**
   * Returns the phase id that follows the given phase, or null if it is the
   * last phase.
   *
   * @param {string} phaseId
   * @returns {string|null}
   */
  getNextPhase(phaseId) {
    const def = this.getDefinition(phaseId);
    const nextIndex = def.order + 1;
    return PHASE_ORDER[nextIndex] ?? null;
  }

  /**
   * Returns the phase id that precedes the given phase, or null if it is the
   * first phase.
   *
   * @param {string} phaseId
   * @returns {string|null}
   */
  getPreviousPhase(phaseId) {
    const def = this.getDefinition(phaseId);
    const prevIndex = def.order - 1;
    return prevIndex >= 0 ? PHASE_ORDER[prevIndex] : null;
  }

  /**
   * Returns true if the supplied phaseId is the last phase in the pipeline.
   *
   * @param {string} phaseId
   * @returns {boolean}
   */
  isLastPhase(phaseId) {
    return this.getNextPhase(phaseId) === null;
  }

  /**
   * Returns true if the supplied phaseId is the first phase in the pipeline.
   *
   * @param {string} phaseId
   * @returns {boolean}
   */
  isFirstPhase(phaseId) {
    return this.getPreviousPhase(phaseId) === null;
  }

  // -----------------------------------------------------------------------
  // Transition validation
  // -----------------------------------------------------------------------

  /**
   * Returns the list of valid target states from a given state.
   *
   * @param {string} fromState - An {@link OrchestratorState} value.
   * @returns {string[]}
   */
  getValidTransitions(fromState) {
    return [...(this.#transitions[fromState] ?? [])];
  }

  /**
   * Checks whether transitioning from `fromState` to `toState` is legal.
   *
   * @param {string} fromState
   * @param {string} toState
   * @returns {boolean}
   */
  isValidTransition(fromState, toState) {
    const allowed = this.#transitions[fromState];
    return Array.isArray(allowed) && allowed.includes(toState);
  }

  /**
   * Validates a proposed state transition, emitting events and returning a
   * result object.
   *
   * @param {string} fromState
   * @param {string} toState
   * @returns {{ valid: boolean, reason?: string }}
   *
   * @fires PhaseManager#transition:validated
   * @fires PhaseManager#transition:rejected
   */
  validateTransition(fromState, toState) {
    if (!Object.values(OrchestratorState).includes(fromState)) {
      const result = { valid: false, reason: `Unknown source state: "${fromState}"` };
      this.emit('transition:rejected', { fromState, toState, ...result });
      return result;
    }

    if (!Object.values(OrchestratorState).includes(toState)) {
      const result = { valid: false, reason: `Unknown target state: "${toState}"` };
      this.emit('transition:rejected', { fromState, toState, ...result });
      return result;
    }

    if (!this.isValidTransition(fromState, toState)) {
      const allowed = this.getValidTransitions(fromState);
      const result = {
        valid: false,
        reason:
          `Transition from "${fromState}" to "${toState}" is not allowed. ` +
          `Valid targets: [${allowed.join(', ')}]`,
      };
      this.emit('transition:rejected', { fromState, toState, ...result });
      return result;
    }

    const result = { valid: true };
    this.emit('transition:validated', { fromState, toState });
    return result;
  }

  // -----------------------------------------------------------------------
  // Input / output validation
  // -----------------------------------------------------------------------

  /**
   * Validates that all required input keys for a phase are present in the
   * supplied context object.
   *
   * @param {string} phaseId
   * @param {Record<string, unknown>} context
   * @returns {{ valid: boolean, missing: string[], optional: string[] }}
   *
   * @fires PhaseManager#input:validated
   * @fires PhaseManager#input:missing
   */
  validatePhaseInput(phaseId, context) {
    const def = this.getDefinition(phaseId);
    const contextKeys = Object.keys(context ?? {});

    const missing = def.requiredInputKeys.filter((k) => !contextKeys.includes(k));
    const presentOptional = def.optionalInputKeys.filter((k) => contextKeys.includes(k));

    const result = {
      valid: missing.length === 0,
      missing,
      optional: presentOptional,
    };

    if (result.valid) {
      this.emit('input:validated', { phaseId, ...result });
    } else {
      this.emit('input:missing', { phaseId, ...result });
    }

    return result;
  }

  /**
   * Validates that a phase produced all of its declared output keys.
   *
   * @param {string} phaseId
   * @param {Record<string, unknown>} output
   * @returns {{ valid: boolean, missing: string[], produced: string[] }}
   *
   * @fires PhaseManager#output:validated
   * @fires PhaseManager#output:missing
   */
  validatePhaseOutput(phaseId, output) {
    const def = this.getDefinition(phaseId);
    const outputKeys = Object.keys(output ?? {});

    const missing = def.outputKeys.filter((k) => !outputKeys.includes(k));
    const produced = def.outputKeys.filter((k) => outputKeys.includes(k));

    const result = {
      valid: missing.length === 0,
      missing,
      produced,
    };

    if (result.valid) {
      this.emit('output:validated', { phaseId, ...result });
    } else {
      this.emit('output:missing', { phaseId, ...result });
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Utility helpers
  // -----------------------------------------------------------------------

  /**
   * Returns a concise summary of all phases suitable for logging or display.
   *
   * @returns {Array<{ id: string, label: string, order: number, inputs: string[], outputs: string[] }>}
   */
  getSummary() {
    return PHASE_ORDER.map((id) => {
      const def = this.getDefinition(id);
      return {
        id: def.id,
        label: def.label,
        order: def.order,
        inputs: [...def.requiredInputKeys],
        outputs: [...def.outputKeys],
      };
    });
  }

  /**
   * Pretty-prints the transition matrix for debugging.
   *
   * @returns {string}
   */
  printTransitionMatrix() {
    const lines = Object.entries(this.#transitions).map(
      ([from, targets]) => `  ${from.padEnd(14)} -> [${targets.join(', ')}]`,
    );
    return ['Transition Matrix:', ...lines].join('\n');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** @type {PhaseManager|null} */
let _instance = null;

/**
 * Returns a shared PhaseManager instance (singleton-friendly).
 *
 * @param {{ fresh?: boolean }} [options]
 * @returns {PhaseManager}
 */
export function createPhaseManager(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new PhaseManager();
  }
  return _instance;
}

export default PhaseManager;
