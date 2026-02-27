/**
 * @module event-bus
 * @description Central event system for the ClawOS framework generation pipeline.
 * Extends Node.js EventEmitter with typed events for every pipeline phase,
 * event history with replay capability, wildcard listener support, and
 * structured event filtering.
 *
 * All pipeline components communicate through this bus so that the system
 * remains loosely coupled and fully observable.
 *
 * Event naming convention:
 *   - All event names use UPPER_SNAKE_CASE constants from {@link ClawEvent}.
 *   - Wildcard listeners use colon-delimited prefixes (e.g. "PIPELINE:*").
 */

import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Event type constants
// ---------------------------------------------------------------------------

/**
 * Typed event constants for every phase and operation in the ClawOS pipeline.
 * @readonly
 * @enum {string}
 */
export const ClawEvent = Object.freeze({
  // -- Pipeline lifecycle --------------------------------------------------
  PIPELINE_START:        'PIPELINE_START',
  PIPELINE_COMPLETE:     'PIPELINE_COMPLETE',
  PIPELINE_ERROR:        'PIPELINE_ERROR',

  // -- Phase lifecycle -----------------------------------------------------
  PHASE_START:           'PHASE_START',
  PHASE_COMPLETE:        'PHASE_COMPLETE',
  PHASE_SKIP:            'PHASE_SKIP',
  PHASE_ERROR:           'PHASE_ERROR',

  // -- Elicitation ---------------------------------------------------------
  ELICITATION_START:     'ELICITATION_START',
  QUESTION_ASKED:        'QUESTION_ASKED',
  ANSWER_RECEIVED:       'ANSWER_RECEIVED',
  ELICITATION_COMPLETE:  'ELICITATION_COMPLETE',

  // -- Blueprint -----------------------------------------------------------
  BLUEPRINT_SELECTED:    'BLUEPRINT_SELECTED',
  BLUEPRINT_COMPOSED:    'BLUEPRINT_COMPOSED',

  // -- File generation -----------------------------------------------------
  FILE_GENERATED:        'FILE_GENERATED',
  FILE_SKIPPED:          'FILE_SKIPPED',
  FILE_ERROR:            'FILE_ERROR',

  // -- Validation ----------------------------------------------------------
  VALIDATION_START:      'VALIDATION_START',
  VALIDATION_COMPLETE:   'VALIDATION_COMPLETE',
  VALIDATION_ERROR:      'VALIDATION_ERROR',

  // -- Integration ---------------------------------------------------------
  INTEGRATION_START:     'INTEGRATION_START',
  INTEGRATION_COMPLETE:  'INTEGRATION_COMPLETE',
});

/** Set of all valid event names for fast membership checks. */
const VALID_EVENTS = new Set(Object.values(ClawEvent));

/**
 * Event group prefixes for wildcard matching.
 * A wildcard listener on "PIPELINE" will match PIPELINE_START, PIPELINE_COMPLETE, etc.
 * @readonly
 * @type {Record<string, string[]>}
 */
const EVENT_GROUPS = Object.freeze({
  PIPELINE:     [ClawEvent.PIPELINE_START, ClawEvent.PIPELINE_COMPLETE, ClawEvent.PIPELINE_ERROR],
  PHASE:        [ClawEvent.PHASE_START, ClawEvent.PHASE_COMPLETE, ClawEvent.PHASE_SKIP, ClawEvent.PHASE_ERROR],
  ELICITATION:  [ClawEvent.ELICITATION_START, ClawEvent.QUESTION_ASKED, ClawEvent.ANSWER_RECEIVED, ClawEvent.ELICITATION_COMPLETE],
  BLUEPRINT:    [ClawEvent.BLUEPRINT_SELECTED, ClawEvent.BLUEPRINT_COMPOSED],
  FILE:         [ClawEvent.FILE_GENERATED, ClawEvent.FILE_SKIPPED, ClawEvent.FILE_ERROR],
  VALIDATION:   [ClawEvent.VALIDATION_START, ClawEvent.VALIDATION_COMPLETE, ClawEvent.VALIDATION_ERROR],
  INTEGRATION:  [ClawEvent.INTEGRATION_START, ClawEvent.INTEGRATION_COMPLETE],
});

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EventRecord
 * @property {string}  event     - The event name that was emitted.
 * @property {*}       data      - The payload passed with the event.
 * @property {string}  timestamp - ISO 8601 timestamp of when the event was emitted.
 * @property {number}  sequence  - Monotonically increasing sequence number.
 */

/**
 * @typedef {Object} EventFilter
 * @property {string}   [event]  - Exact event name to match.
 * @property {string}   [group]  - Event group prefix (e.g. "PIPELINE", "PHASE").
 * @property {string}   [since]  - ISO 8601 timestamp; only events after this time.
 * @property {string}   [until]  - ISO 8601 timestamp; only events before this time.
 * @property {number}   [limit]  - Maximum number of records to return.
 * @property {number}   [fromSequence] - Only events with sequence >= this value.
 */

// ---------------------------------------------------------------------------
// ClawEventBus class
// ---------------------------------------------------------------------------

/**
 * Central event bus for the ClawOS pipeline. Extends EventEmitter with:
 *   - Typed event constants
 *   - Full event history with configurable retention
 *   - Replay from any point in history
 *   - Wildcard / group listeners
 *   - Structured event filtering
 *
 * @extends EventEmitter
 *
 * @example
 * ```js
 * import { getEventBus, ClawEvent } from './event-bus.js';
 *
 * const bus = getEventBus();
 *
 * bus.on(ClawEvent.PHASE_START, (data) => {
 *   console.log(`Phase started: ${data.phase}`);
 * });
 *
 * bus.emit(ClawEvent.PHASE_START, { phase: 'DISCOVER' });
 *
 * const history = bus.getHistory({ group: 'PHASE' });
 * ```
 */
export class ClawEventBus extends EventEmitter {
  // -----------------------------------------------------------------------
  // Private state
  // -----------------------------------------------------------------------

  /** @type {EventRecord[]} Ordered history of all emitted events. */
  #history = [];

  /** @type {number} Next sequence number. */
  #sequence = 0;

  /** @type {number} Maximum number of events to retain. 0 = unlimited. */
  #maxHistory;

  /** @type {boolean} Whether history recording is enabled. */
  #recordHistory;

  /** @type {Map<string, Set<Function>>} Wildcard pattern -> handler set. */
  #wildcardListeners = new Map();

  /**
   * @param {Object} [options]
   * @param {number}  [options.maxHistory=10000]  - Max events to retain in history. 0 for unlimited.
   * @param {boolean} [options.recordHistory=true] - Enable/disable history recording.
   */
  constructor(options = {}) {
    super();
    this.#maxHistory = options.maxHistory ?? 10_000;
    this.#recordHistory = options.recordHistory ?? true;

    // Raise the default listener limit for a bus that many components subscribe to.
    this.setMaxListeners(200);
  }

  // -----------------------------------------------------------------------
  // Emit (override)
  // -----------------------------------------------------------------------

  /**
   * Emits a typed event with the given data payload. The event is recorded in
   * history and also dispatched to any matching wildcard listeners.
   *
   * @param {string} event - One of {@link ClawEvent} constants (or any string).
   * @param {*}      [data] - Arbitrary event payload.
   * @returns {boolean} True if the event had listeners.
   *
   * @example
   * bus.emit(ClawEvent.FILE_GENERATED, { path: 'src/index.js', bytes: 1024 });
   */
  emit(event, data) {
    // Record in history
    if (this.#recordHistory) {
      /** @type {EventRecord} */
      const record = {
        event,
        data: data !== undefined ? this.#cloneData(data) : undefined,
        timestamp: new Date().toISOString(),
        sequence: this.#sequence++,
      };

      this.#history.push(record);

      // Enforce retention limit
      if (this.#maxHistory > 0 && this.#history.length > this.#maxHistory) {
        this.#history.splice(0, this.#history.length - this.#maxHistory);
      }
    }

    // Dispatch to standard EventEmitter listeners
    const hadListeners = super.emit(event, data);

    // Dispatch to wildcard listeners
    this.#dispatchWildcards(event, data);

    return hadListeners;
  }

  // -----------------------------------------------------------------------
  // Wildcard listeners
  // -----------------------------------------------------------------------

  /**
   * Registers a listener that fires for ALL events matching a group prefix.
   * The handler receives `(eventName, data)`.
   *
   * Supported patterns:
   *   - `"*"`          - matches every event
   *   - `"PIPELINE:*"` - matches PIPELINE_START, PIPELINE_COMPLETE, PIPELINE_ERROR
   *   - `"PHASE:*"`    - matches PHASE_START, PHASE_COMPLETE, PHASE_SKIP, PHASE_ERROR
   *   - Any group key from EVENT_GROUPS with `:*` suffix
   *
   * @param {string}   pattern - Wildcard pattern (e.g. "*" or "PIPELINE:*").
   * @param {Function} handler - Callback receiving (eventName, data).
   * @returns {ClawEventBus} This instance for chaining.
   *
   * @example
   * bus.onAny('PHASE:*', (eventName, data) => {
   *   console.log(`Phase event: ${eventName}`, data);
   * });
   */
  onAny(pattern, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('[ClawEventBus] Wildcard handler must be a function.');
    }

    if (!this.#wildcardListeners.has(pattern)) {
      this.#wildcardListeners.set(pattern, new Set());
    }
    this.#wildcardListeners.get(pattern).add(handler);

    return this;
  }

  /**
   * Removes a wildcard listener. If no handler is provided, removes all
   * listeners for that pattern.
   *
   * @param {string}   pattern - The wildcard pattern.
   * @param {Function} [handler] - Specific handler to remove.
   * @returns {ClawEventBus} This instance for chaining.
   */
  offAny(pattern, handler) {
    if (!this.#wildcardListeners.has(pattern)) return this;

    if (handler) {
      this.#wildcardListeners.get(pattern).delete(handler);
      if (this.#wildcardListeners.get(pattern).size === 0) {
        this.#wildcardListeners.delete(pattern);
      }
    } else {
      this.#wildcardListeners.delete(pattern);
    }

    return this;
  }

  // -----------------------------------------------------------------------
  // History
  // -----------------------------------------------------------------------

  /**
   * Returns event history records matching the given filter criteria.
   *
   * @param {EventFilter} [filter={}] - Filter criteria.
   * @returns {EventRecord[]} Matching records in chronological order (deep copies).
   *
   * @example
   * // Get all phase events
   * const phaseEvents = bus.getHistory({ group: 'PHASE' });
   *
   * // Get the last 5 file events
   * const fileEvents = bus.getHistory({ group: 'FILE', limit: 5 });
   *
   * // Get events since a specific time
   * const recent = bus.getHistory({ since: '2026-02-27T10:00:00Z' });
   */
  getHistory(filter = {}) {
    let records = this.#history;

    // Filter by exact event name
    if (filter.event) {
      records = records.filter((r) => r.event === filter.event);
    }

    // Filter by event group
    if (filter.group) {
      const groupKey = filter.group.toUpperCase().replace(/:?\*?$/, '');
      const groupEvents = EVENT_GROUPS[groupKey];
      if (groupEvents) {
        const groupSet = new Set(groupEvents);
        records = records.filter((r) => groupSet.has(r.event));
      } else {
        // Fallback: prefix match against event name
        const prefix = groupKey + '_';
        records = records.filter((r) => r.event.startsWith(prefix));
      }
    }

    // Filter by timestamp range
    if (filter.since) {
      const sinceDate = new Date(filter.since).getTime();
      records = records.filter((r) => new Date(r.timestamp).getTime() >= sinceDate);
    }

    if (filter.until) {
      const untilDate = new Date(filter.until).getTime();
      records = records.filter((r) => new Date(r.timestamp).getTime() <= untilDate);
    }

    // Filter by sequence number
    if (filter.fromSequence !== undefined) {
      records = records.filter((r) => r.sequence >= filter.fromSequence);
    }

    // Apply limit (take the most recent N if limited)
    if (filter.limit && filter.limit > 0 && records.length > filter.limit) {
      records = records.slice(-filter.limit);
    }

    // Return deep copies to prevent history tampering
    return records.map((r) => JSON.parse(JSON.stringify(r)));
  }

  /**
   * Replays historical events from a given starting point. Each replayed event
   * is re-emitted through the normal emit path (and therefore re-recorded).
   *
   * @param {string|number} from - An event name (replays from the first
   *   occurrence) or a sequence number.
   * @param {Object} [options]
   * @param {boolean} [options.skipHistory=true] - If true, replayed events
   *   are NOT re-recorded in history (prevents duplication).
   * @returns {number} The number of events replayed.
   *
   * @example
   * // Replay from the first PHASE_START event
   * bus.replay(ClawEvent.PHASE_START);
   *
   * // Replay from sequence number 42
   * bus.replay(42);
   */
  replay(from, options = {}) {
    const skipHistory = options.skipHistory ?? true;

    let startIndex;

    if (typeof from === 'number') {
      startIndex = this.#history.findIndex((r) => r.sequence >= from);
    } else if (typeof from === 'string') {
      startIndex = this.#history.findIndex((r) => r.event === from);
    } else {
      throw new TypeError(
        '[ClawEventBus] replay() "from" must be an event name (string) or sequence number.',
      );
    }

    if (startIndex === -1) return 0;

    const toReplay = this.#history.slice(startIndex);
    const wasRecording = this.#recordHistory;

    if (skipHistory) {
      this.#recordHistory = false;
    }

    let count = 0;
    for (const record of toReplay) {
      super.emit(record.event, record.data);
      this.#dispatchWildcards(record.event, record.data);
      count++;
    }

    if (skipHistory) {
      this.#recordHistory = wasRecording;
    }

    return count;
  }

  /**
   * Clears the entire event history.
   *
   * @returns {ClawEventBus} This instance for chaining.
   */
  clearHistory() {
    this.#history = [];
    // Sequence is intentionally NOT reset to maintain monotonicity.
    return this;
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /**
   * Enables or disables history recording.
   *
   * @param {boolean} enabled
   * @returns {ClawEventBus} This instance for chaining.
   */
  setRecordHistory(enabled) {
    this.#recordHistory = Boolean(enabled);
    return this;
  }

  /**
   * Returns whether history recording is currently enabled.
   *
   * @returns {boolean}
   */
  get isRecording() {
    return this.#recordHistory;
  }

  /**
   * Returns the current size of the event history.
   *
   * @returns {number}
   */
  get historySize() {
    return this.#history.length;
  }

  /**
   * Returns the current sequence counter value (the next sequence number
   * that will be assigned).
   *
   * @returns {number}
   */
  get currentSequence() {
    return this.#sequence;
  }

  // -----------------------------------------------------------------------
  // Convenience: typed once helpers
  // -----------------------------------------------------------------------

  /**
   * Returns a promise that resolves when the specified event is next emitted.
   * Useful for awaiting pipeline milestones.
   *
   * @param {string} event   - The event to wait for.
   * @param {number} [timeout=0] - Optional timeout in ms. 0 = no timeout.
   * @returns {Promise<*>} Resolves with the event data.
   * @throws {Error} If the timeout is exceeded.
   *
   * @example
   * const result = await bus.waitFor(ClawEvent.PIPELINE_COMPLETE, 30000);
   */
  waitFor(event, timeout = 0) {
    return new Promise((resolve, reject) => {
      let timer;

      const handler = (data) => {
        if (timer) clearTimeout(timer);
        resolve(data);
      };

      this.once(event, handler);

      if (timeout > 0) {
        timer = setTimeout(() => {
          this.removeListener(event, handler);
          reject(new Error(
            `[ClawEventBus] Timed out waiting for event "${event}" after ${timeout}ms.`,
          ));
        }, timeout);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  /**
   * Completely resets the event bus: removes all listeners, clears history,
   * and resets the sequence counter. Useful for testing.
   *
   * @returns {ClawEventBus} This instance for chaining.
   */
  reset() {
    this.removeAllListeners();
    this.#wildcardListeners.clear();
    this.#history = [];
    this.#sequence = 0;
    return this;
  }

  // -----------------------------------------------------------------------
  // Static helpers
  // -----------------------------------------------------------------------

  /**
   * Returns the set of all valid typed event names.
   *
   * @returns {string[]}
   */
  static getEventTypes() {
    return [...VALID_EVENTS];
  }

  /**
   * Returns the event group mapping.
   *
   * @returns {Record<string, string[]>}
   */
  static getEventGroups() {
    return JSON.parse(JSON.stringify(EVENT_GROUPS));
  }

  /**
   * Returns true if the given name is a recognized typed event.
   *
   * @param {string} name
   * @returns {boolean}
   */
  static isValidEvent(name) {
    return VALID_EVENTS.has(name);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Dispatches an event to all matching wildcard listeners.
   *
   * @param {string} event - The event name that was emitted.
   * @param {*}      data  - The event payload.
   */
  #dispatchWildcards(event, data) {
    for (const [pattern, handlers] of this.#wildcardListeners.entries()) {
      if (this.#matchesWildcard(pattern, event)) {
        for (const handler of handlers) {
          try {
            handler(event, data);
          } catch (err) {
            // Emit an error event but don't let a bad wildcard handler crash the bus.
            // Use super.emit to avoid infinite recursion if the error handler itself fails.
            super.emit('error', {
              message: `[ClawEventBus] Wildcard handler error for pattern "${pattern}"`,
              originalEvent: event,
              error: err,
            });
          }
        }
      }
    }
  }

  /**
   * Tests whether an event name matches a wildcard pattern.
   *
   * @param {string} pattern - Wildcard pattern (e.g. "*", "PHASE:*").
   * @param {string} event   - Event name to test.
   * @returns {boolean}
   */
  #matchesWildcard(pattern, event) {
    // Universal wildcard
    if (pattern === '*') return true;

    // Group wildcard: "GROUP:*" or "GROUP"
    const groupKey = pattern.replace(/:?\*?$/, '').toUpperCase();
    const groupEvents = EVENT_GROUPS[groupKey];
    if (groupEvents) {
      return groupEvents.includes(event);
    }

    // Prefix wildcard: "PREFIX_*" or "PREFIX:*"
    const prefix = groupKey + '_';
    return event.startsWith(prefix);
  }

  /**
   * Deep-clones event data for history storage. Falls back to identity for
   * non-cloneable values.
   *
   * @param {*} data
   * @returns {*}
   */
  #cloneData(data) {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      // Non-serializable data (functions, circular refs): store reference
      return data;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton / factory
// ---------------------------------------------------------------------------

/** @type {ClawEventBus|null} */
let _instance = null;

/**
 * Returns a shared ClawEventBus instance (singleton). On first call or when
 * `fresh` is true, a new instance is created.
 *
 * @param {Object}  [options]
 * @param {boolean} [options.fresh]         - Force a new instance.
 * @param {number}  [options.maxHistory]    - Max history retention.
 * @param {boolean} [options.recordHistory] - Enable/disable history.
 * @returns {ClawEventBus}
 */
export function getEventBus(options = {}) {
  if (options.fresh || !_instance) {
    _instance = new ClawEventBus(options);
  }
  return _instance;
}

/**
 * Alias for {@link getEventBus} following the project's createX naming convention.
 *
 * @param {Object} [options]
 * @returns {ClawEventBus}
 */
export function createEventBus(options = {}) {
  return getEventBus(options);
}

export default ClawEventBus;
