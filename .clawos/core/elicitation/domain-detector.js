/**
 * @fileoverview Domain Detector for the ClawOS Elicitation Engine.
 *
 * Analyses a user's natural-language description and maps it to one of
 * eight recognised framework domains. Uses a multi-signal scoring system
 * that combines:
 *   - Exact keyword matching
 *   - Phrase / pattern matching
 *   - Synonym expansion
 *   - Weighted confidence scoring
 *
 * No external dependencies -- pure JavaScript.
 *
 * @module domain-detector
 * @version 1.0.0
 * @author Victor De Marco
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {'api' | 'cli' | 'testing' | 'ui' | 'data' | 'ai-agent' | 'automation' | 'plugin' | 'custom'} DomainName
 */

/**
 * @typedef {Object} DomainScore
 * @property {DomainName} domain     - The domain identifier.
 * @property {number}     confidence - Confidence between 0 and 1.
 */

/**
 * @typedef {Object} DetectionResult
 * @property {DomainScore}   primary    - Highest-confidence domain.
 * @property {DomainScore[]} secondary  - Additional domains above threshold, sorted descending.
 * @property {string[]}      keywords   - Keywords found in the input that influenced scoring.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum confidence for a domain to be considered at all. */
const MIN_CONFIDENCE_THRESHOLD = 0.10;

/** Minimum confidence for a domain to appear in the secondary list. */
const SECONDARY_THRESHOLD = 0.20;

/**
 * The eight supported domains.
 *
 * @type {DomainName[]}
 */
const DOMAINS = [
  'api',
  'cli',
  'testing',
  'ui',
  'data',
  'ai-agent',
  'automation',
  'plugin',
  'custom',
];

// ---------------------------------------------------------------------------
// Keyword Maps  (weight 1.0 per keyword hit)
// ---------------------------------------------------------------------------

/**
 * Direct keyword-to-domain mapping. Each entry is an array of lowercase
 * keywords that strongly indicate the domain.
 *
 * @type {Record<DomainName, string[]>}
 */
const KEYWORD_MAP = {
  api: [
    'api', 'rest', 'restful', 'graphql', 'grpc', 'endpoint', 'endpoints',
    'route', 'router', 'routing', 'middleware', 'http', 'https', 'request',
    'response', 'server', 'microservice', 'microservices', 'gateway',
    'webhook', 'webhooks', 'cors', 'jwt', 'oauth', 'authentication',
    'authorization', 'rate-limit', 'rate-limiting', 'swagger', 'openapi',
    'trpc', 'websocket', 'websockets', 'express', 'fastify', 'hono', 'koa',
  ],
  cli: [
    'cli', 'command-line', 'command', 'commands', 'terminal', 'shell',
    'console', 'argv', 'argument', 'arguments', 'flag', 'flags', 'option',
    'options', 'subcommand', 'subcommands', 'prompt', 'prompts',
    'interactive', 'stdin', 'stdout', 'stderr', 'spinner', 'progress-bar',
    'commander', 'oclif', 'yargs', 'inquirer', 'chalk',
  ],
  testing: [
    'test', 'tests', 'testing', 'tdd', 'bdd', 'spec', 'specs', 'assertion',
    'assertions', 'assert', 'expect', 'mock', 'mocking', 'stub', 'stubs',
    'spy', 'spies', 'fixture', 'fixtures', 'coverage', 'snapshot',
    'snapshots', 'e2e', 'end-to-end', 'integration-test', 'unit-test',
    'test-runner', 'jest', 'mocha', 'vitest', 'playwright', 'cypress',
    'supertest', 'beforeeach', 'aftereach', 'describe', 'it',
  ],
  ui: [
    'ui', 'user-interface', 'component', 'components', 'render', 'rendering',
    'dom', 'virtual-dom', 'vdom', 'jsx', 'tsx', 'template', 'templates',
    'html', 'css', 'style', 'styles', 'layout', 'responsive', 'animation',
    'animations', 'state', 'state-management', 'store', 'signals', 'hooks',
    'reactivity', 'reactive', 'frontend', 'front-end', 'spa',
    'single-page', 'ssr', 'server-side-rendering', 'hydration',
    'web-components', 'shadow-dom', 'react', 'vue', 'svelte', 'solid',
    'preact', 'lit',
  ],
  data: [
    'data', 'dataset', 'datasets', 'etl', 'extract', 'transform', 'load',
    'pipeline', 'pipelines', 'stream', 'streams', 'streaming', 'batch',
    'processing', 'processor', 'csv', 'json', 'xml', 'parquet', 'avro',
    'schema', 'validation', 'ingestion', 'ingest', 'warehouse',
    'data-lake', 'datalake', 'analytics', 'aggregation', 'aggregate',
    'partition', 'shard', 'sharding', 'backpressure',
  ],
  'ai-agent': [
    'ai', 'agent', 'agents', 'llm', 'llms', 'gpt', 'claude', 'model',
    'models', 'prompt', 'prompts', 'chain', 'chains', 'rag', 'retrieval',
    'embedding', 'embeddings', 'vector', 'vectors', 'vector-store',
    'memory', 'tool-use', 'function-calling', 'reasoning', 'planning',
    'multi-agent', 'orchestrator', 'guardrails', 'safety', 'langchain',
    'openai', 'anthropic', 'chatbot', 'chat', 'completion', 'inference',
    'fine-tune', 'fine-tuning', 'neural', 'machine-learning', 'ml',
    'artificial-intelligence',
  ],
  automation: [
    'automation', 'automate', 'workflow', 'workflows', 'task', 'tasks',
    'task-runner', 'cron', 'schedule', 'scheduler', 'scheduling', 'job',
    'jobs', 'queue', 'worker', 'workers', 'trigger', 'triggers',
    'orchestration', 'dag', 'dependency-graph', 'ci', 'cd', 'ci-cd',
    'continuous', 'deploy', 'deployment', 'build', 'builds', 'make',
    'makefile', 'gulp', 'grunt', 'turbo', 'nx', 'github-actions',
    'devops',
  ],
  plugin: [
    'plugin', 'plugins', 'extension', 'extensions', 'addon', 'addons',
    'add-on', 'add-ons', 'module', 'modules', 'hook', 'hooks',
    'middleware', 'loader', 'loaders', 'registry', 'registries',
    'marketplace', 'sdk', 'host', 'lifecycle', 'activate', 'deactivate',
    'install', 'uninstall', 'sandbox', 'sandboxed', 'capability',
    'capabilities', 'permission', 'permissions', 'vscode', 'webpack',
    'babel', 'eslint', 'rollup',
  ],
  custom: [],
};

// ---------------------------------------------------------------------------
// Phrase Patterns  (weight 2.0 per match -- phrases are more specific)
// ---------------------------------------------------------------------------

/**
 * Regex patterns that strongly indicate a domain. Each pattern is matched
 * against the normalised input string. They capture multi-word phrases that
 * are more reliable than single keywords.
 *
 * @type {Record<DomainName, RegExp[]>}
 */
const PHRASE_PATTERNS = {
  api: [
    /\brest\s*api\b/,
    /\bgraphql\s*(api|server|endpoint)\b/,
    /\bapi\s*(server|gateway|framework)\b/,
    /\bhttp\s*server\b/,
    /\bweb\s*server\b/,
    /\bmicro\s*service/,
    /\brequest[\s-]*response/,
    /\broute[\s-]*handler/,
    /\bmiddleware\s*pipeline\b/,
    /\bbackend\s*(framework|server|api)\b/,
  ],
  cli: [
    /\bcommand[\s-]*line\s*(tool|interface|app|application|framework)\b/,
    /\bcli\s*(tool|framework|app|application|builder)\b/,
    /\bterminal\s*(tool|app|application)\b/,
    /\bshell\s*(tool|script|framework)\b/,
    /\bargument\s*pars/,
    /\binteractive\s*(prompt|cli|terminal)\b/,
  ],
  testing: [
    /\btest(ing)?\s*(framework|library|runner|suite|harness)\b/,
    /\bunit\s*test/,
    /\bintegration\s*test/,
    /\bend[\s-]*to[\s-]*end\s*test/,
    /\be2e\s*test/,
    /\btest\s*driven/,
    /\bbehavior[\s-]*driven/,
    /\bassertion\s*(library|framework)\b/,
    /\bcode\s*coverage/,
    /\bsnapshot\s*test/,
  ],
  ui: [
    /\bui\s*(framework|library|component|toolkit)\b/,
    /\buser\s*interface/,
    /\bcomponent\s*(library|system|framework|toolkit)\b/,
    /\bfrontend\s*(framework|library)\b/,
    /\bfront[\s-]*end\s*(framework|library)\b/,
    /\breact[\s-]*like\b/,
    /\bvirtual[\s-]*dom/,
    /\bstate[\s-]*management/,
    /\bserver[\s-]*side[\s-]*render/,
    /\bweb[\s-]*component/,
    /\bdesign[\s-]*system/,
  ],
  data: [
    /\bdata\s*(pipeline|processing|framework|ingestion|transformation)\b/,
    /\betl\b/,
    /\bstream\s*process/,
    /\bbatch\s*process/,
    /\bdata[\s-]*lake/,
    /\bdata[\s-]*warehouse/,
    /\bdata\s*(validation|cleaning|wrangling)\b/,
    /\breal[\s-]*time\s*(data|processing|analytics)\b/,
  ],
  'ai-agent': [
    /\bai\s*(agent|framework|orchestrat|system)\b/,
    /\bagent\s*(framework|orchestrat|system)\b/,
    /\bllm\s*(framework|orchestrat|wrapper|tool)\b/,
    /\bmulti[\s-]*agent/,
    /\btool[\s-]*use/,
    /\bfunction[\s-]*call/,
    /\bretrieval[\s-]*augmented/,
    /\bchat[\s-]*bot\b/,
    /\bprompt\s*(engineer|template|chain)\b/,
    /\bvector[\s-]*store/,
  ],
  automation: [
    /\bworkflow\s*(engine|framework|automation|builder|system)\b/,
    /\btask[\s-]*runner/,
    /\btask\s*(automation|orchestrat|schedul)\b/,
    /\bjob\s*(scheduler|queue|runner)\b/,
    /\bbuild\s*(system|tool|pipeline)\b/,
    /\bci[\s/]cd\b/,
    /\bcontinuous\s*(integration|delivery|deployment)\b/,
    /\bcron[\s-]*job/,
    /\bdevops\s*(tool|framework|pipeline)\b/,
  ],
  plugin: [
    /\bplugin\s*(system|framework|architecture|engine|manager)\b/,
    /\bextension\s*(system|framework|architecture|engine|manager)\b/,
    /\baddon\s*(system|framework)\b/,
    /\bmodular\s*(system|architecture|framework)\b/,
    /\bpluggable\b/,
    /\bhook[\s-]*system/,
    /\bplugin\s*lifecycle/,
    /\bplugin\s*(registry|marketplace|sdk)\b/,
  ],
  custom: [],
};

// ---------------------------------------------------------------------------
// Synonym Map  (expand input before keyword matching)
// ---------------------------------------------------------------------------

/**
 * Maps synonyms and abbreviations to their canonical forms so that
 * the keyword matcher recognises them.
 *
 * @type {Record<string, string>}
 */
const SYNONYM_MAP = {
  // API synonyms
  'web service':       'api server',
  'web api':           'rest api',
  'backend':           'api server',
  'back-end':          'api server',
  'http api':          'rest api',
  'restful service':   'rest api',
  'micro service':     'microservice',

  // CLI synonyms
  'command line':      'cli',
  'terminal tool':     'cli tool',
  'shell tool':        'cli tool',
  'console app':       'cli app',
  'command line interface': 'cli',

  // Testing synonyms
  'test suite':        'testing framework',
  'test harness':      'testing framework',
  'spec runner':       'test runner',
  'unit tests':        'unit test',
  'e2e tests':         'e2e test',

  // UI synonyms
  'user interface':    'ui framework',
  'frontend':          'ui',
  'front-end':         'ui',
  'ui library':        'ui framework',
  'component lib':     'component library',
  'design system':     'ui component framework',
  'web framework':     'ui framework',

  // Data synonyms
  'data pipeline':     'data processing pipeline',
  'data flow':         'data pipeline',
  'data stream':       'stream processing',
  'data ingestion':    'data processing',
  'data transformation': 'etl',
  'data wrangling':    'data transformation',

  // AI / Agent synonyms
  'artificial intelligence': 'ai',
  'machine learning':  'ai ml',
  'large language model': 'llm',
  'chatbot':           'chat bot ai agent',
  'conversational ai': 'ai agent chat',
  'copilot':           'ai agent',

  // Automation synonyms
  'task automation':   'automation task-runner',
  'build system':      'automation build',
  'job scheduler':     'automation scheduler',
  'workflow automation': 'automation workflow',
  'cicd':              'ci cd',
  'ci/cd':             'ci cd',
  'continuous integration': 'ci automation',
  'continuous delivery': 'cd automation',
  'devops':            'automation ci cd deploy',

  // Plugin synonyms
  'extension system':  'plugin system',
  'addon system':      'plugin system',
  'add-on system':     'plugin system',
  'modular architecture': 'plugin modular',
  'pluggable':         'plugin',
  'extensible':        'plugin extension',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalises user input for matching: lowercase, collapse whitespace,
 * strip punctuation (except hyphens), and apply synonym expansion.
 *
 * @param {string} input - Raw user input.
 * @returns {string} Normalised text ready for matching.
 */
function normalise(input) {
  if (typeof input !== 'string') return '';

  let text = input
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')   // strip punctuation except hyphens
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();

  // Apply synonym expansion -- longest match first to avoid partial overwrites.
  const sortedSynonyms = Object.keys(SYNONYM_MAP).sort((a, b) => b.length - a.length);
  for (const synonym of sortedSynonyms) {
    if (text.includes(synonym)) {
      text = text.replace(new RegExp(escapeRegex(synonym), 'g'), SYNONYM_MAP[synonym]);
    }
  }

  return text;
}

/**
 * Escapes special regex characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokenises normalised text into unique lowercase words.
 *
 * @param {string} text - Normalised text.
 * @returns {Set<string>}
 */
function tokenise(text) {
  return new Set(text.split(/[\s-]+/).filter(Boolean));
}

// ---------------------------------------------------------------------------
// Scoring Engine
// ---------------------------------------------------------------------------

/** Weight applied to each keyword hit. */
const KEYWORD_WEIGHT = 1.0;

/** Weight applied to each phrase-pattern hit. */
const PHRASE_WEIGHT = 2.5;

/**
 * Computes raw scores for each domain against the normalised input.
 *
 * @param {string} normalisedInput - Normalised user text.
 * @returns {{ scores: Record<DomainName, number>, matchedKeywords: string[] }}
 */
function computeRawScores(normalisedInput) {
  const tokens = tokenise(normalisedInput);
  /** @type {Record<string, number>} */
  const scores = {};
  /** @type {string[]} */
  const matchedKeywords = [];

  for (const domain of DOMAINS) {
    let score = 0;

    // --- Keyword scoring ---
    for (const keyword of KEYWORD_MAP[domain]) {
      // Support multi-word keywords by checking inclusion in full text.
      if (keyword.includes(' ') || keyword.includes('-')) {
        if (normalisedInput.includes(keyword)) {
          score += KEYWORD_WEIGHT;
          matchedKeywords.push(keyword);
        }
      } else if (tokens.has(keyword)) {
        score += KEYWORD_WEIGHT;
        matchedKeywords.push(keyword);
      }
    }

    // --- Phrase-pattern scoring ---
    for (const pattern of PHRASE_PATTERNS[domain]) {
      if (pattern.test(normalisedInput)) {
        score += PHRASE_WEIGHT;
        // Extract matched text for the keywords array.
        const match = normalisedInput.match(pattern);
        if (match) matchedKeywords.push(match[0]);
      }
    }

    scores[domain] = score;
  }

  return { scores, matchedKeywords: [...new Set(matchedKeywords)] };
}

/**
 * Converts raw numeric scores into 0-1 confidence values using a
 * softmax-inspired normalisation. If all scores are zero, every domain
 * gets 0 confidence.
 *
 * @param {Record<DomainName, number>} rawScores
 * @returns {Record<DomainName, number>}
 */
function normaliseScores(rawScores) {
  const total = Object.values(rawScores).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return Object.fromEntries(DOMAINS.map((d) => [d, 0]));
  }

  /** @type {Record<string, number>} */
  const normalised = {};
  for (const domain of DOMAINS) {
    // Apply a gentle exponential boost so dominant domains stand out more.
    normalised[domain] = rawScores[domain] / total;
  }

  // Re-normalise after any boosting.
  const boosted = {};
  let boostedTotal = 0;
  for (const domain of DOMAINS) {
    const exp = Math.pow(normalised[domain], 1.3); // gentle sharpening
    boosted[domain] = exp;
    boostedTotal += exp;
  }

  for (const domain of DOMAINS) {
    boosted[domain] = boostedTotal > 0
      ? Math.round((boosted[domain] / boostedTotal) * 1000) / 1000
      : 0;
  }

  return boosted;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects the most likely framework domain(s) from a user's natural-language
 * description.
 *
 * @param {string} userInput - The user's description of the framework they want.
 * @returns {DetectionResult} Detection result with primary domain, secondaries,
 *          and matched keywords.
 *
 * @example
 * const result = detectDomain('I need a REST API framework with JWT auth');
 * // result.primary => { domain: 'api', confidence: 0.82 }
 */
export function detectDomain(userInput) {
  const normalisedInput = normalise(userInput);
  const { scores: rawScores, matchedKeywords } = computeRawScores(normalisedInput);
  const confidences = normaliseScores(rawScores);

  // Sort domains by confidence descending.
  const sorted = DOMAINS
    .map((domain) => ({ domain, confidence: confidences[domain] }))
    .sort((a, b) => b.confidence - a.confidence);

  const primary = sorted[0].confidence >= MIN_CONFIDENCE_THRESHOLD
    ? sorted[0]
    : { domain: /** @type {DomainName} */ ('custom'), confidence: 0 };

  const secondary = sorted
    .slice(1)
    .filter((s) => s.confidence >= SECONDARY_THRESHOLD && s.domain !== 'custom');

  const isGeneric = primary.confidence < 0.6;
  const isMultiDomain = sorted.filter(s => s.confidence >= 0.25 && s.domain !== 'custom').length >= 2;
  const teamReplacement = detectTeamReplacement(userInput);
  const scope = detectScope(userInput);

  return {
    primary,
    secondary,
    keywords: matchedKeywords,
    isGeneric,
    isMultiDomain,
    teamReplacement,
    scope,
  };
}

// ---------------------------------------------------------------------------
// Team Replacement Detection
// ---------------------------------------------------------------------------

/** @type {RegExp[]} */
const TEAM_PATTERNS = [
  /\b(replace|substituir|automat[ei])\s*(a\s*)?(team|equipe|squad|time)\b/i,
  /\b(team|equipe|squad)\s*(replacement|substitution|automation)\b/i,
  /\bmanage\s*(my\s*)?(dev|development|qa|testing|design|marketing|sales|ops|support)\s*(team|workflow|process)\b/i,
  /\bmulti[\s-]*agent\b/i,
  /\bagent[\s-]*based\b/i,
  /\borchestrat[ei]\s*(agents|team|roles|workflow)\b/i,
  /\b(dev|qa|pm|architect|designer|analyst|devops)\s*(agent|role|workflow)\b/i,
  /\bcoordinate\s*(agents|team|roles)\b/i,
  /\b(roles|personas|agents)\s*(and\s*)?(workflows|pipelines|tasks)\b/i,
];

/** @type {Record<string, { agents: string[], workflows: string[] }>} */
const TEAM_PRESETS = {
  development: {
    agents: ['project-manager', 'architect', 'developer', 'qa-engineer', 'devops'],
    workflows: ['planning', 'development', 'code-review', 'testing', 'deployment'],
  },
  qa: {
    agents: ['qa-lead', 'test-engineer', 'automation-engineer'],
    workflows: ['test-planning', 'test-execution', 'bug-triage', 'regression'],
  },
  marketing: {
    agents: ['content-strategist', 'copywriter', 'seo-specialist', 'analyst'],
    workflows: ['content-planning', 'content-creation', 'review', 'publishing', 'analytics'],
  },
  support: {
    agents: ['support-lead', 'support-agent', 'escalation-manager', 'knowledge-manager'],
    workflows: ['ticket-triage', 'resolution', 'escalation', 'knowledge-update'],
  },
  design: {
    agents: ['ux-researcher', 'ui-designer', 'design-reviewer'],
    workflows: ['research', 'wireframing', 'prototyping', 'design-review', 'handoff'],
  },
  generic: {
    agents: ['coordinator', 'specialist', 'reviewer', 'reporter'],
    workflows: ['planning', 'execution', 'review', 'delivery'],
  },
};

/**
 * Detects whether the user input describes a team-replacement scenario.
 *
 * @param {string} userInput
 * @returns {{ isTeamReplacement: boolean, suggestedAgents: string[], suggestedWorkflows: string[] }}
 */
export function detectTeamReplacement(userInput) {
  const text = userInput.toLowerCase();
  const isTeamReplacement = TEAM_PATTERNS.some(p => p.test(text));

  if (!isTeamReplacement) {
    return { isTeamReplacement: false, suggestedAgents: [], suggestedWorkflows: [] };
  }

  // Detect which team preset matches best
  let bestPreset = 'generic';
  for (const key of Object.keys(TEAM_PRESETS)) {
    if (key !== 'generic' && text.includes(key)) {
      bestPreset = key;
      break;
    }
  }

  // Also check shorthand keywords
  if (text.match(/\b(dev|development|software|coding|programming)\b/)) bestPreset = 'development';
  else if (text.match(/\b(qa|test|quality)\b/)) bestPreset = 'qa';
  else if (text.match(/\b(marketing|content|seo)\b/)) bestPreset = 'marketing';
  else if (text.match(/\b(support|helpdesk|customer\s*service)\b/)) bestPreset = 'support';
  else if (text.match(/\b(design|ux|ui\s*design)\b/)) bestPreset = 'design';

  const preset = TEAM_PRESETS[bestPreset];
  return {
    isTeamReplacement: true,
    suggestedAgents: preset.agents,
    suggestedWorkflows: preset.workflows,
  };
}

// ---------------------------------------------------------------------------
// Scope Detection
// ---------------------------------------------------------------------------

/**
 * Detects the likely scope/size of the requested framework.
 *
 * @param {string} userInput
 * @returns {'small' | 'medium' | 'large'}
 */
export function detectScope(userInput) {
  const text = userInput.toLowerCase();

  const largeIndicators = [
    /\b(enterprise|large[\s-]*scale|production|distributed|micro[\s-]*service)/,
    /\b(multi[\s-]*agent|multi[\s-]*team|full[\s-]*stack|end[\s-]*to[\s-]*end)/,
    /\b(scalable|high[\s-]*availability|fault[\s-]*tolerant|mission[\s-]*critical)/,
    /\b(platform|ecosystem|marketplace|saas)/,
  ];

  const smallIndicators = [
    /\b(simple|small|tiny|minimal|lightweight|basic|quick|single)/,
    /\b(utility|helper|tool|script|snippet|wrapper)/,
    /\b(prototype|poc|proof[\s-]*of[\s-]*concept|experiment|demo)/,
  ];

  let score = 0; // negative = small, positive = large
  for (const p of largeIndicators) { if (p.test(text)) score += 2; }
  for (const p of smallIndicators) { if (p.test(text)) score -= 2; }

  // Word count as a secondary signal — longer descriptions suggest larger scope
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 40) score += 1;
  if (wordCount < 10) score -= 1;

  if (score >= 2) return 'large';
  if (score <= -2) return 'small';
  return 'medium';
}

/**
 * Returns the full list of supported domain names.
 *
 * @returns {DomainName[]}
 */
export function getSupportedDomains() {
  return [...DOMAINS];
}

/**
 * Returns the raw keyword map (useful for debugging / introspection).
 *
 * @returns {Record<DomainName, string[]>}
 */
export function getKeywordMap() {
  return KEYWORD_MAP;
}

/**
 * Returns the phrase-pattern map (useful for debugging / introspection).
 *
 * @returns {Record<DomainName, RegExp[]>}
 */
export function getPhrasePatterns() {
  return PHRASE_PATTERNS;
}

/**
 * Returns the synonym map (useful for debugging / introspection).
 *
 * @returns {Record<string, string>}
 */
export function getSynonymMap() {
  return { ...SYNONYM_MAP };
}
