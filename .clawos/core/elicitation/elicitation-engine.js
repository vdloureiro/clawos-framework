/**
 * @fileoverview Elicitation Engine for the ClawOS Meta-Framework.
 *
 * Orchestrates the requirement-gathering phase by:
 *  1. Accepting a detected domain from the Domain Detector.
 *  2. Loading the appropriate question set from the Question Bank.
 *  3. Walking the user through questions one at a time with branching
 *     logic (conditions on the evolving profile).
 *  4. Compiling answers into a structured RequirementsProfile.
 *
 * Design goals:
 *  - Zero external dependencies.
 *  - Deterministic question ordering (required -> recommended -> optional).
 *  - Smart defaults for skipped questions.
 *  - Full JSDoc coverage.
 *
 * @module elicitation-engine
 * @version 1.0.0
 * @author Victor De Marco
 */

import { detectDomain } from './domain-detector.js';
import {
  getQuestionsForDomain,
  filterApplicableQuestions,
  getQuestionById,
} from './question-bank.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {'small' | 'medium' | 'large'} ScalabilityLevel
 */

/**
 * @typedef {Object} Architecture
 * @property {string}   pattern - Architecture pattern (e.g. "modular").
 * @property {string}   style   - Code organisation style (e.g. "layered").
 * @property {string[]} layers  - Active architectural layers.
 */

/**
 * @typedef {Object} TestingConfig
 * @property {boolean} unit        - Unit tests enabled.
 * @property {boolean} integration - Integration tests enabled.
 * @property {boolean} e2e         - End-to-end tests enabled.
 */

/**
 * @typedef {Object} DeploymentConfig
 * @property {boolean} docker - Generate Docker files.
 * @property {string}  ci     - CI/CD system ("github-actions", "none", etc.).
 * @property {string}  cloud  - Target cloud provider ("none", "aws", etc.).
 */

/**
 * @typedef {Object} ClaudeCodeConfig
 * @property {string[]} commands   - Slash commands to generate.
 * @property {string[]} mcpServers - MCP server integrations.
 */

/**
 * @typedef {Object} RequirementsProfile
 * @property {string}           domain        - Primary framework domain.
 * @property {string}           name          - Framework name (kebab-case).
 * @property {string}           description   - Short description.
 * @property {string}           language      - Primary language.
 * @property {Architecture}     architecture  - Architecture settings.
 * @property {string[]}         features      - Enabled features / capabilities.
 * @property {string[]}         integrations  - Third-party integrations.
 * @property {ScalabilityLevel} scalability   - Target scale.
 * @property {TestingConfig}    testing       - Testing strategy.
 * @property {DeploymentConfig} deployment    - Deployment configuration.
 * @property {ClaudeCodeConfig} claudeCode    - Claude Code integration.
 * @property {Object}           domainSpecific - Raw domain-specific answers.
 * @property {Object}           meta          - Metadata (timestamps, version).
 */

/**
 * @typedef {'idle' | 'in-progress' | 'complete'} EngineState
 */

/**
 * @typedef {Object} QuestionDefinition
 * @property {string}            id
 * @property {string}            text
 * @property {string}            type
 * @property {string[]}          [options]
 * @property {*}                 default
 * @property {string}            priority
 * @property {function(Object): boolean} condition
 * @property {function(*): *}    transform
 */

// ---------------------------------------------------------------------------
// Priority ordering map  (lower = asked first)
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
const PRIORITY_ORDER = {
  required: 0,
  recommended: 1,
  optional: 2,
};

// ---------------------------------------------------------------------------
// Profile Mapping  (question id -> profile path)
// ---------------------------------------------------------------------------

/**
 * Maps a question id prefix to the path where its answer should be stored
 * inside the RequirementsProfile. Answers for domain-specific questions
 * are nested under domainSpecific.<domain>.<key>.
 *
 * @param {string} questionId - The question's unique id.
 * @returns {{ section: string, key: string }}
 */
function mapQuestionToProfilePath(questionId) {
  const [prefix, ...rest] = questionId.split('.');
  const key = rest.join('.');

  switch (prefix) {
    case 'common':
      return { section: 'root', key };
    case 'arch':
      return { section: 'architecture', key };
    case 'int':
      return { section: 'integrations', key };
    case 'test':
      return { section: 'testing', key };
    case 'deploy':
      return { section: 'deployment', key };
    case 'claude':
      return { section: 'claudeCode', key };
    default:
      // Domain-specific questions (api, cli, ui, data, etc.)
      return { section: 'domainSpecific', key: `${prefix}.${key}` };
  }
}

// ---------------------------------------------------------------------------
// ElicitationEngine Class
// ---------------------------------------------------------------------------

/**
 * The main Elicitation Engine.
 *
 * Usage:
 * ```js
 * const engine = new ElicitationEngine();
 * engine.startElicitation('api');
 *
 * while (!engine.isComplete()) {
 *   const question = engine.askNext();
 *   if (!question) break;
 *   // present question to user, get answer
 *   engine.processAnswer(answer);
 * }
 *
 * const profile = engine.getProfile();
 * ```
 */
export class ElicitationEngine {
  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  /**
   * Creates a new ElicitationEngine instance.
   *
   * @param {Object} [options]
   * @param {boolean} [options.skipOptional=false]   - If true, optional
   *        questions are automatically answered with their defaults.
   * @param {boolean} [options.skipRecommended=false] - If true, recommended
   *        questions are also auto-answered.
   */
  constructor(options = {}) {
    /** @type {boolean} */
    this._skipOptional = options.skipOptional ?? false;

    /** @type {boolean} */
    this._skipRecommended = options.skipRecommended ?? false;

    /** @type {EngineState} */
    this._state = 'idle';

    /** @type {string | null} */
    this._domain = null;

    /**
     * Full ordered question queue (rebuilt after each answer to re-evaluate
     * conditions).
     *
     * @type {QuestionDefinition[]}
     */
    this._questionQueue = [];

    /**
     * Set of question ids that have already been asked or skipped.
     *
     * @type {Set<string>}
     */
    this._askedIds = new Set();

    /**
     * The question currently awaiting an answer. Null when no question is
     * pending.
     *
     * @type {QuestionDefinition | null}
     */
    this._currentQuestion = null;

    /**
     * Raw answers indexed by question id.
     *
     * @type {Map<string, *>}
     */
    this._answers = new Map();

    /**
     * The incrementally-built requirements profile.
     *
     * @type {RequirementsProfile}
     */
    this._profile = ElicitationEngine._createEmptyProfile();
  }

  // -----------------------------------------------------------------------
  // Static helpers
  // -----------------------------------------------------------------------

  /**
   * Returns a fresh, empty RequirementsProfile with all sections
   * initialised to their zero-values.
   *
   * @returns {RequirementsProfile}
   */
  static _createEmptyProfile() {
    return {
      domain: '',
      name: '',
      description: '',
      language: 'typescript',
      architecture: {
        pattern: 'modular',
        style: 'layered',
        layers: [],
      },
      features: [],
      integrations: [],
      scalability: 'medium',
      testing: {
        unit: true,
        integration: true,
        e2e: false,
      },
      deployment: {
        docker: true,
        ci: 'github-actions',
        cloud: 'none',
      },
      claudeCode: {
        commands: [],
        mcpServers: [],
      },
      domainSpecific: {},
      meta: {
        createdAt: new Date().toISOString(),
        engineVersion: '1.0.0',
        completionRatio: 0,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Initialises the elicitation session for the given domain.
   *
   * This loads the correct question set, sorts by priority, and prepares the
   * engine to start asking questions via {@link askNext}.
   *
   * @param {string} domain - A valid domain name (e.g. "api", "cli").
   *        Alternatively, pass a natural-language string and the engine will
   *        run domain detection automatically.
   * @returns {void}
   * @throws {Error} If the engine is already in progress.
   */
  startElicitation(domain) {
    if (this._state === 'in-progress') {
      throw new Error(
        'ElicitationEngine: A session is already in progress. ' +
        'Call reset() before starting a new one.',
      );
    }

    // If `domain` does not look like one of the 8 canonical domain names,
    // treat it as natural-language and detect.
    const canonicalDomains = [
      'api', 'cli', 'testing', 'ui', 'data', 'ai-agent', 'automation', 'plugin',
    ];

    if (canonicalDomains.includes(domain)) {
      this._domain = domain;
    } else {
      const detection = detectDomain(domain);
      this._domain = detection.primary.domain;
    }

    this._profile.domain = this._domain;
    this._state = 'in-progress';
    this._askedIds = new Set();
    this._answers = new Map();
    this._currentQuestion = null;

    // Build initial question queue.
    this._rebuildQueue();
  }

  /**
   * Returns the next question to ask the user, or `null` if the session
   * is complete.
   *
   * The returned object is a plain copy of the question definition, safe
   * to serialise (condition and transform functions are stripped).
   *
   * @returns {Object | null} A serialisable question object, or null.
   */
  askNext() {
    if (this._state !== 'in-progress') return null;

    // Rebuild queue so conditions are re-evaluated against latest profile.
    this._rebuildQueue();

    // Find the first unanswered, applicable question.
    const next = this._questionQueue.find((q) => !this._askedIds.has(q.id));

    if (!next) {
      this._finalise();
      return null;
    }

    // Auto-answer optional / recommended questions when configured to skip.
    if (this._shouldAutoAnswer(next)) {
      this._applyAnswer(next, next.default);
      this._askedIds.add(next.id);
      // Recurse to get the next real question.
      return this.askNext();
    }

    this._currentQuestion = next;

    // Return a serialisable copy.
    return {
      id: next.id,
      text: next.text,
      type: next.type,
      options: next.options ?? [],
      default: next.default,
      priority: next.priority,
    };
  }

  /**
   * Processes the user's answer to the current question.
   *
   * Pass `null` or `undefined` to accept the question's default value.
   *
   * @param {*} answer - The user's answer (type depends on the question type).
   * @returns {void}
   * @throws {Error} If no question is currently pending.
   */
  processAnswer(answer) {
    if (!this._currentQuestion) {
      throw new Error(
        'ElicitationEngine: No question is currently pending. ' +
        'Call askNext() first.',
      );
    }

    const question = this._currentQuestion;

    // Use the default when the user provides nothing.
    const raw = answer === null || answer === undefined
      ? question.default
      : answer;

    this._applyAnswer(question, raw);
    this._askedIds.add(question.id);
    this._currentQuestion = null;
  }

  /**
   * Returns the current RequirementsProfile.
   *
   * Can be called at any time to inspect partial results. The profile is
   * deeply cloned so external mutations do not affect the engine.
   *
   * @returns {RequirementsProfile} Deep copy of the profile.
   */
  getProfile() {
    return structuredClone(this._profile);
  }

  /**
   * Returns `true` when all applicable questions have been asked (or
   * auto-answered) and the profile is complete.
   *
   * @returns {boolean}
   */
  isComplete() {
    return this._state === 'complete';
  }

  /**
   * Returns the current engine state.
   *
   * @returns {EngineState}
   */
  getState() {
    return this._state;
  }

  /**
   * Returns the number of questions remaining in the current session.
   *
   * @returns {number}
   */
  getRemainingCount() {
    if (this._state !== 'in-progress') return 0;
    this._rebuildQueue();
    return this._questionQueue.filter((q) => !this._askedIds.has(q.id)).length;
  }

  /**
   * Returns the completion ratio as a value between 0 and 1.
   *
   * @returns {number}
   */
  getCompletionRatio() {
    if (this._state === 'idle') return 0;
    if (this._state === 'complete') return 1;

    this._rebuildQueue();
    const total = this._questionQueue.length;
    if (total === 0) return 1;
    return Math.round((this._askedIds.size / total) * 100) / 100;
  }

  /**
   * Returns a summary of all answers given so far, indexed by question id.
   *
   * @returns {Record<string, *>}
   */
  getAnswersSummary() {
    return Object.fromEntries(this._answers);
  }

  /**
   * Resets the engine to its idle state, clearing all progress.
   *
   * @returns {void}
   */
  reset() {
    this._state = 'idle';
    this._domain = null;
    this._questionQueue = [];
    this._askedIds = new Set();
    this._currentQuestion = null;
    this._answers = new Map();
    this._profile = ElicitationEngine._createEmptyProfile();
  }

  /**
   * Applies default answers for all remaining unanswered questions and
   * marks the session as complete. Useful for a "quick mode" where the
   * user just wants sensible defaults.
   *
   * @returns {RequirementsProfile} The finalised profile.
   */
  applyAllDefaults() {
    if (this._state !== 'in-progress') {
      throw new Error(
        'ElicitationEngine: Cannot apply defaults -- no session in progress.',
      );
    }

    this._rebuildQueue();

    for (const question of this._questionQueue) {
      if (!this._askedIds.has(question.id)) {
        this._applyAnswer(question, question.default);
        this._askedIds.add(question.id);
      }
    }

    this._finalise();
    return this.getProfile();
  }

  /**
   * Manually injects an answer for a specific question id without going
   * through the normal askNext/processAnswer flow. Useful for pre-filling
   * known values (e.g. from a config file or CLI flags).
   *
   * @param {string} questionId - The question id (e.g. "common.name").
   * @param {*}      answer     - The value to inject.
   * @returns {boolean} True if the question was found and the answer applied.
   */
  injectAnswer(questionId, answer) {
    const question = getQuestionById(questionId);
    if (!question) return false;

    this._applyAnswer(question, answer);
    this._askedIds.add(question.id);
    return true;
  }

  // -----------------------------------------------------------------------
  // Private Methods
  // -----------------------------------------------------------------------

  /**
   * Rebuilds the question queue by loading all questions for the current
   * domain, filtering by conditions, and sorting by priority.
   *
   * @private
   * @returns {void}
   */
  _rebuildQueue() {
    if (!this._domain) return;

    const allQuestions = getQuestionsForDomain(this._domain);
    const applicable = filterApplicableQuestions(allQuestions, this._profile);

    // Sort: required first, then recommended, then optional.
    // Within the same priority, maintain the original order from the bank.
    applicable.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return pa - pb;
    });

    this._questionQueue = applicable;
  }

  /**
   * Determines whether a question should be auto-answered based on the
   * engine's skip settings.
   *
   * @private
   * @param {QuestionDefinition} question
   * @returns {boolean}
   */
  _shouldAutoAnswer(question) {
    if (this._skipOptional && question.priority === 'optional') return true;
    if (this._skipRecommended && question.priority === 'recommended') return true;
    return false;
  }

  /**
   * Transforms and stores a raw answer for the given question, updating
   * both the answers map and the requirements profile.
   *
   * @private
   * @param {QuestionDefinition} question
   * @param {*} rawAnswer
   * @returns {void}
   */
  _applyAnswer(question, rawAnswer) {
    // Transform the raw answer.
    let value;
    try {
      value = question.transform(rawAnswer);
    } catch {
      value = question.default;
    }

    // Store raw + transformed.
    this._answers.set(question.id, value);

    // Write into the profile.
    const { section, key } = mapQuestionToProfilePath(question.id);

    switch (section) {
      case 'root':
        this._setRootProperty(key, value);
        break;
      case 'architecture':
        this._setNestedProperty(this._profile.architecture, key, value);
        break;
      case 'testing':
        this._setNestedProperty(this._profile.testing, key, value);
        break;
      case 'deployment':
        this._setNestedProperty(this._profile.deployment, key, value);
        break;
      case 'claudeCode':
        this._setClaudeCodeProperty(key, value);
        break;
      case 'integrations':
        this._addToIntegrations(key, value);
        break;
      case 'domainSpecific':
        this._setDomainSpecificProperty(key, value);
        break;
      default:
        // Fallback: store under domainSpecific.
        this._setDomainSpecificProperty(`${section}.${key}`, value);
    }
  }

  /**
   * Sets a top-level property on the profile (name, description, language,
   * scalability).
   *
   * @private
   * @param {string} key
   * @param {*} value
   */
  _setRootProperty(key, value) {
    switch (key) {
      case 'name':
        this._profile.name = value;
        break;
      case 'description':
        this._profile.description = value;
        break;
      case 'language':
        this._profile.language = value;
        break;
      case 'scale':
        this._profile.scalability = value;
        break;
      default:
        // Store extras under meta.
        this._profile.meta[key] = value;
    }
  }

  /**
   * Sets a property within a nested profile object.
   *
   * @private
   * @param {Object} target
   * @param {string} key
   * @param {*} value
   */
  _setNestedProperty(target, key, value) {
    if (target && typeof target === 'object') {
      target[key] = value;
    }
  }

  /**
   * Handles Claude Code section property setting with correct mapping.
   *
   * @private
   * @param {string} key
   * @param {*} value
   */
  _setClaudeCodeProperty(key, value) {
    switch (key) {
      case 'slash_commands':
        this._profile.claudeCode.commands = Array.isArray(value) ? value : [];
        break;
      case 'mcp_servers':
        this._profile.claudeCode.mcpServers = Array.isArray(value) ? value : [];
        break;
      case 'generate_claude_md':
        this._profile.claudeCode.generateClaudeMd = value;
        break;
      default:
        this._profile.claudeCode[key] = value;
    }
  }

  /**
   * Adds integration values to the profile's integrations array,
   * filtering out "none".
   *
   * @private
   * @param {string} key
   * @param {*} value
   */
  _addToIntegrations(key, value) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item && item !== 'none' && !this._profile.integrations.includes(item)) {
        this._profile.integrations.push(item);
      }
    }
  }

  /**
   * Sets a domain-specific property, creating intermediate objects as
   * needed. Keys use dot-notation (e.g. "api.protocol").
   *
   * @private
   * @param {string} dotKey
   * @param {*} value
   */
  _setDomainSpecificProperty(dotKey, value) {
    const parts = dotKey.split('.');
    let target = this._profile.domainSpecific;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in target) || typeof target[parts[i]] !== 'object') {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }

    target[parts[parts.length - 1]] = value;
  }

  /**
   * Builds the features array from the collected answers by scanning for
   * boolean "confirm" answers that represent feature toggles.
   *
   * @private
   * @returns {string[]}
   */
  _buildFeaturesArray() {
    /** @type {string[]} */
    const features = [];

    // Map of answer keys whose `true` values represent "features".
    const featureKeys = [
      'arch.plugin_system',
      'arch.logging',
      'arch.event_system',
      'api.validation',
      'api.rate_limiting',
      'api.docs',
      'api.cors',
      'api.caching',
      'api.middleware_pipeline',
      'cli.arg_parsing',
      'cli.subcommands',
      'cli.config_file',
      'cli.auto_complete',
      'cli.progress_indicators',
      'cli.help_generation',
      'cli.plugin_commands',
      'cli.update_notifier',
      'testing.mocking',
      'testing.coverage',
      'testing.snapshot',
      'testing.parallel',
      'testing.watch_mode',
      'testing.fixtures',
      'testing.browser',
      'ui.ssr',
      'ui.routing',
      'ui.accessibility',
      'ui.animations',
      'ui.dev_tools',
      'ui.i18n',
      'data.validation',
      'data.transformations',
      'data.scheduling',
      'data.retry_strategy',
      'data.monitoring',
      'data.backpressure',
      'data.partitioning',
      'ai.tool_use',
      'ai.planning',
      'ai.streaming',
      'ai.guardrails',
      'ai.observability',
      'ai.human_in_loop',
      'auto.concurrency',
      'auto.dependency_graph',
      'auto.retry',
      'auto.state_persistence',
      'auto.notifications',
      'auto.sandboxing',
      'auto.dashboard',
      'plugin.isolation',
      'plugin.dependency_management',
      'plugin.marketplace',
      'plugin.versioning',
      'plugin.hot_reload',
      'plugin.permissions',
      'plugin.settings_schema',
    ];

    for (const key of featureKeys) {
      if (this._answers.get(key) === true) {
        // Convert the question id into a readable feature name.
        const label = key.split('.').pop().replace(/_/g, '-');
        features.push(label);
      }
    }

    return features;
  }

  /**
   * Marks the session as complete and compiles the final profile.
   *
   * @private
   * @returns {void}
   */
  _finalise() {
    this._profile.features = this._buildFeaturesArray();
    this._profile.meta.completedAt = new Date().toISOString();
    this._profile.meta.completionRatio = 1;
    this._profile.meta.totalQuestionsAsked = this._askedIds.size;
    this._state = 'complete';
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

/**
 * Creates a new ElicitationEngine, starts a session for the given domain,
 * and returns the engine ready to ask questions.
 *
 * @param {string}  domain             - Domain name or natural-language description.
 * @param {Object}  [options]          - Engine options.
 * @param {boolean} [options.skipOptional=false]
 * @param {boolean} [options.skipRecommended=false]
 * @returns {ElicitationEngine}
 */
export function createElicitation(domain, options = {}) {
  const engine = new ElicitationEngine(options);
  engine.startElicitation(domain);
  return engine;
}
