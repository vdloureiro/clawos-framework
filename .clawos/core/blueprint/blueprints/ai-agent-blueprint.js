/**
 * @module AiAgentBlueprint
 * @description Complete blueprint definition for AI Agent frameworks.
 * Covers autonomous agent orchestration, planning/reasoning loops, memory systems,
 * tool registries, model adapters, guardrails, RAG pipelines, and multi-agent
 * coordination. Designed for LLM-powered autonomous and semi-autonomous agents.
 *
 * @author ClawOS Framework
 * @license MIT
 */

/**
 * @typedef {import('../blueprint-engine.js').Blueprint} Blueprint
 */

/**
 * Full AI Agent framework blueprint.
 * @type {Blueprint}
 */
const aiAgentBlueprint = {
  name: 'ai-agent-framework',
  description: 'Autonomous AI agent framework with planning/reasoning loops, memory management, tool execution, model adapters, guardrails, RAG pipelines, and multi-agent orchestration',
  archetype: 'ai-agent',
  domain: 'ai',

  structure: {
    directories: [
      'src',
      'src/orchestrator',
      'src/planner',
      'src/planner/strategies',
      'src/memory',
      'src/memory/stores',
      'src/tools',
      'src/tools/built-in',
      'src/model-adapter',
      'src/model-adapter/providers',
      'src/guardrails',
      'src/guardrails/rules',
      'src/rag',
      'src/rag/loaders',
      'src/rag/chunkers',
      'src/rag/retrievers',
      'src/agents',
      'src/agents/presets',
      'src/prompts',
      'src/prompts/templates',
      'src/core',
      'src/core/errors',
      'src/core/logger',
      'src/core/config',
      'src/core/events',
      'src/core/state',
      'src/utils',
      'config',
      'config/agents',
      'docs',
      'docs/architecture',
      'docs/agents',
      'tests',
      'tests/unit',
      'tests/unit/planner',
      'tests/unit/memory',
      'tests/unit/tools',
      'tests/unit/guardrails',
      'tests/integration',
      'tests/fixtures',
      'tests/fixtures/conversations',
      'tests/fixtures/tool-calls',
      'scripts',
      '.claude',
      '.claude/commands',
      '.github',
      '.github/workflows',
    ],

    files: [
      // ── Root ──
      { path: 'package.json', description: 'Package manifest with agent-specific scripts', template: 'package-json' },
      { path: 'README.md', description: 'Agent architecture overview, setup, configuration guide', template: 'readme' },
      { path: '.gitignore', description: 'Git ignore rules (includes .env, vector stores, model caches)', template: 'gitignore' },
      { path: '.env.example', description: 'Environment template (API keys, model endpoints)', template: 'env-example-ai' },

      // ── Entry ──
      { path: 'src/index.js', description: 'Agent framework entry — bootstrap orchestrator, load tools, connect model', template: 'agent-entry' },

      // ── Orchestrator ──
      { path: 'src/orchestrator/index.js', description: 'Orchestrator barrel export', template: 'barrel' },
      { path: 'src/orchestrator/orchestrator.js', description: 'Main agent loop — observe, plan, act, reflect cycle', template: 'orchestrator' },
      { path: 'src/orchestrator/run-manager.js', description: 'Manages agent run lifecycle (start, pause, resume, abort, timeout)', template: 'run-manager' },
      { path: 'src/orchestrator/context.js', description: 'Execution context — carries state, tools, memory refs through the loop', template: 'agent-context' },
      { path: 'src/orchestrator/multi-agent.js', description: 'Multi-agent coordination — delegation, consensus, handoff protocols', template: 'multi-agent' },

      // ── Planner ──
      { path: 'src/planner/index.js', description: 'Planner barrel export', template: 'barrel' },
      { path: 'src/planner/planner.js', description: 'Abstract planner interface — accepts goal, returns action plan', template: 'planner' },
      { path: 'src/planner/plan.js', description: 'Plan data structure — steps, dependencies, status tracking', template: 'plan' },
      { path: 'src/planner/strategies/react.js', description: 'ReAct (Reason + Act) planning strategy', template: 'strategy-react' },
      { path: 'src/planner/strategies/chain-of-thought.js', description: 'Chain-of-thought decomposition strategy', template: 'strategy-cot' },
      { path: 'src/planner/strategies/tree-of-thought.js', description: 'Tree-of-thought branching strategy', template: 'strategy-tot' },
      { path: 'src/planner/strategies/reflexion.js', description: 'Reflexion self-critique and retry strategy', template: 'strategy-reflexion' },

      // ── Memory ──
      { path: 'src/memory/index.js', description: 'Memory barrel export', template: 'barrel' },
      { path: 'src/memory/memory-manager.js', description: 'Memory lifecycle — store, retrieve, summarize, forget', template: 'memory-manager' },
      { path: 'src/memory/conversation-buffer.js', description: 'Short-term sliding-window conversation buffer', template: 'conversation-buffer' },
      { path: 'src/memory/summary-memory.js', description: 'Long-term summarized memory (compresses old messages)', template: 'summary-memory' },
      { path: 'src/memory/stores/in-memory.js', description: 'In-memory vector / key-value store', template: 'store-memory' },
      { path: 'src/memory/stores/file-store.js', description: 'File-based persistent memory store', template: 'store-file' },
      { path: 'src/memory/stores/vector-store.js', description: 'Vector similarity store for semantic retrieval', template: 'store-vector' },

      // ── Tools ──
      { path: 'src/tools/index.js', description: 'Tools barrel export', template: 'barrel' },
      { path: 'src/tools/tool-registry.js', description: 'Tool registration, discovery, and schema validation', template: 'tool-registry' },
      { path: 'src/tools/tool-executor.js', description: 'Safe tool execution with sandboxing, timeout, and retry', template: 'tool-executor' },
      { path: 'src/tools/tool-interface.js', description: 'Tool interface — name, description, parameters schema, execute()', template: 'tool-interface' },
      { path: 'src/tools/built-in/web-search.js', description: 'Web search tool', template: 'tool-web-search' },
      { path: 'src/tools/built-in/file-read.js', description: 'File reading tool', template: 'tool-file-read' },
      { path: 'src/tools/built-in/file-write.js', description: 'File writing tool', template: 'tool-file-write' },
      { path: 'src/tools/built-in/shell-exec.js', description: 'Shell command execution tool (sandboxed)', template: 'tool-shell-exec' },
      { path: 'src/tools/built-in/calculator.js', description: 'Mathematical expression evaluator tool', template: 'tool-calculator' },
      { path: 'src/tools/built-in/http-request.js', description: 'HTTP request tool for API calls', template: 'tool-http-request' },

      // ── Model Adapter ──
      { path: 'src/model-adapter/index.js', description: 'Model adapter barrel export', template: 'barrel' },
      { path: 'src/model-adapter/adapter.js', description: 'Abstract model adapter — chat, complete, embed interface', template: 'model-adapter' },
      { path: 'src/model-adapter/message-formatter.js', description: 'Converts internal messages to provider-specific formats', template: 'message-formatter' },
      { path: 'src/model-adapter/token-counter.js', description: 'Token counting / budget tracking', template: 'token-counter' },
      { path: 'src/model-adapter/providers/anthropic.js', description: 'Anthropic Claude adapter (Messages API)', template: 'provider-anthropic' },
      { path: 'src/model-adapter/providers/openai.js', description: 'OpenAI adapter (Chat Completions)', template: 'provider-openai' },
      { path: 'src/model-adapter/providers/local.js', description: 'Local model adapter (Ollama / llama.cpp)', template: 'provider-local' },

      // ── Guardrails ──
      { path: 'src/guardrails/index.js', description: 'Guardrails barrel export', template: 'barrel' },
      { path: 'src/guardrails/guardrail-runner.js', description: 'Runs input/output guardrail checks in sequence', template: 'guardrail-runner' },
      { path: 'src/guardrails/guardrail-interface.js', description: 'Guardrail interface — check(input) -> {pass, reason}', template: 'guardrail-interface' },
      { path: 'src/guardrails/rules/content-filter.js', description: 'Content safety filter rule', template: 'rule-content-filter' },
      { path: 'src/guardrails/rules/token-budget.js', description: 'Token budget enforcement rule', template: 'rule-token-budget' },
      { path: 'src/guardrails/rules/tool-permission.js', description: 'Tool usage permission rule', template: 'rule-tool-permission' },
      { path: 'src/guardrails/rules/output-schema.js', description: 'Output schema / format validation rule', template: 'rule-output-schema' },

      // ── RAG ──
      { path: 'src/rag/index.js', description: 'RAG pipeline barrel export', template: 'barrel' },
      { path: 'src/rag/pipeline.js', description: 'RAG pipeline — load, chunk, embed, retrieve, augment', template: 'rag-pipeline' },
      { path: 'src/rag/loaders/text-loader.js', description: 'Plain text document loader', template: 'loader-text' },
      { path: 'src/rag/loaders/json-loader.js', description: 'JSON document loader', template: 'loader-json' },
      { path: 'src/rag/loaders/markdown-loader.js', description: 'Markdown document loader with frontmatter', template: 'loader-markdown' },
      { path: 'src/rag/chunkers/fixed-size.js', description: 'Fixed-size text chunker with overlap', template: 'chunker-fixed' },
      { path: 'src/rag/chunkers/recursive.js', description: 'Recursive character text splitter', template: 'chunker-recursive' },
      { path: 'src/rag/retrievers/similarity.js', description: 'Cosine similarity retriever', template: 'retriever-similarity' },

      // ── Agents (presets) ──
      { path: 'src/agents/index.js', description: 'Agent presets barrel export', template: 'barrel' },
      { path: 'src/agents/agent-builder.js', description: 'Fluent builder for composing custom agents', template: 'agent-builder' },
      { path: 'src/agents/presets/research-agent.js', description: 'Pre-configured research agent (search + summarize)', template: 'agent-research' },
      { path: 'src/agents/presets/coding-agent.js', description: 'Pre-configured coding agent (read, write, test)', template: 'agent-coding' },
      { path: 'src/agents/presets/conversational-agent.js', description: 'Pre-configured conversational agent with memory', template: 'agent-conversational' },

      // ── Prompts ──
      { path: 'src/prompts/index.js', description: 'Prompts barrel export', template: 'barrel' },
      { path: 'src/prompts/prompt-builder.js', description: 'Prompt composition — system, user, assistant, tool messages', template: 'prompt-builder' },
      { path: 'src/prompts/template-engine.js', description: 'Variable interpolation and conditional blocks in prompt templates', template: 'template-engine' },
      { path: 'src/prompts/templates/system.md', description: 'Default system prompt template', template: 'prompt-system' },
      { path: 'src/prompts/templates/planning.md', description: 'Planning step prompt template', template: 'prompt-planning' },
      { path: 'src/prompts/templates/reflection.md', description: 'Self-reflection prompt template', template: 'prompt-reflection' },

      // ── Core infrastructure ──
      { path: 'src/core/errors/agent-error.js', description: 'Agent-specific error types (PlanningError, ToolError, GuardrailError)', template: 'agent-error' },
      { path: 'src/core/errors/error-codes.js', description: 'Agent error code constants', template: 'agent-error-codes' },
      { path: 'src/core/errors/index.js', description: 'Errors barrel export', template: 'barrel' },
      { path: 'src/core/logger/logger.js', description: 'Structured logger with agent-run correlation IDs', template: 'logger' },
      { path: 'src/core/logger/index.js', description: 'Logger barrel export', template: 'barrel' },
      { path: 'src/core/config/config-loader.js', description: 'Config loader — model settings, tool permissions, guardrails', template: 'config-loader' },
      { path: 'src/core/config/index.js', description: 'Config barrel export', template: 'barrel' },
      { path: 'src/core/events/event-bus.js', description: 'Event bus for agent lifecycle events (plan, act, observe, reflect)', template: 'event-bus' },
      { path: 'src/core/events/index.js', description: 'Events barrel export', template: 'barrel' },
      { path: 'src/core/state/state-machine.js', description: 'Agent state machine (idle, planning, executing, reflecting, done, error)', template: 'agent-state-machine' },
      { path: 'src/core/state/index.js', description: 'State barrel export', template: 'barrel' },

      // ── Utils ──
      { path: 'src/utils/retry.js', description: 'Retry with exponential backoff for API calls', template: 'retry' },
      { path: 'src/utils/throttle.js', description: 'Request throttling / rate limiting for model calls', template: 'throttle' },
      { path: 'src/utils/json-parser.js', description: 'Lenient JSON parser for LLM output (handles markdown fences, trailing commas)', template: 'json-parser' },
      { path: 'src/utils/cost-tracker.js', description: 'API cost estimation and tracking', template: 'cost-tracker' },
      { path: 'src/utils/index.js', description: 'Utils barrel export', template: 'barrel' },

      // ── Config ──
      { path: 'config/default.json', description: 'Default agent configuration (model, temperature, max tokens, tools)', template: 'config-default-agent' },
      { path: 'config/agents/research.json', description: 'Research agent preset config', template: 'config-agent-research' },
      { path: 'config/agents/coding.json', description: 'Coding agent preset config', template: 'config-agent-coding' },

      // ── Tests ──
      { path: 'tests/setup.js', description: 'Test harness — mock model adapter, fixture loading', template: 'test-setup' },
      { path: 'tests/unit/planner/react.test.js', description: 'ReAct planner unit tests', template: 'test-unit' },
      { path: 'tests/unit/memory/conversation-buffer.test.js', description: 'Conversation buffer unit tests', template: 'test-unit' },
      { path: 'tests/unit/tools/tool-executor.test.js', description: 'Tool executor unit tests', template: 'test-unit' },
      { path: 'tests/unit/guardrails/content-filter.test.js', description: 'Content filter guardrail tests', template: 'test-unit' },
      { path: 'tests/integration/agent-run.test.js', description: 'Full agent run integration test', template: 'test-integration' },
      { path: 'tests/fixtures/conversations/simple.json', description: 'Simple conversation fixture', template: 'fixture-conversation' },
      { path: 'tests/fixtures/tool-calls/search.json', description: 'Tool call fixture (web search)', template: 'fixture-tool-call' },

      // ── Claude Code ──
      { path: 'CLAUDE.md', description: 'Claude Code context — agent architecture, loop design, tool conventions', template: 'claude-md' },
      { path: '.claude/settings.json', description: 'Claude Code settings with agent-specific permissions', template: 'claude-settings' },
      { path: '.claude/commands/review.md', description: '/review — review agent logic and guardrails', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: '/test — run agent tests with mocked models', template: 'claude-cmd-test' },
      { path: '.claude/commands/add-tool.md', description: '/add-tool — scaffold a new agent tool', template: 'claude-cmd-add-tool' },
      { path: '.claude/commands/trace.md', description: '/trace — trace a full agent run for debugging', template: 'claude-cmd-trace' },

      // ── CI ──
      { path: '.github/workflows/ci.yml', description: 'CI pipeline (lint, test, guardrail checks)', template: 'github-actions-ci' },
    ],
  },

  modules: [
    {
      name: 'orchestrator',
      path: 'src/orchestrator',
      responsibility: 'Main agent loop — observe/plan/act/reflect cycle, run lifecycle, multi-agent coordination',
      dependencies: ['planner', 'memory', 'tools', 'model-adapter', 'guardrails', 'core/state', 'core/events'],
      exports: ['Orchestrator', 'RunManager', 'AgentContext', 'MultiAgent'],
    },
    {
      name: 'planner',
      path: 'src/planner',
      responsibility: 'Goal decomposition, action planning, strategy selection (ReAct, CoT, ToT, Reflexion)',
      dependencies: ['model-adapter', 'prompts', 'core/errors'],
      exports: ['Planner', 'Plan', 'ReactStrategy', 'ChainOfThoughtStrategy', 'TreeOfThoughtStrategy', 'ReflexionStrategy'],
    },
    {
      name: 'memory',
      path: 'src/memory',
      responsibility: 'Short-term and long-term memory, conversation buffers, summarization, vector retrieval',
      dependencies: ['model-adapter', 'core/config'],
      exports: ['MemoryManager', 'ConversationBuffer', 'SummaryMemory', 'InMemoryStore', 'FileStore', 'VectorStore'],
    },
    {
      name: 'tools',
      path: 'src/tools',
      responsibility: 'Tool registration, schema validation, sandboxed execution, timeout/retry, built-in tools',
      dependencies: ['core/errors', 'core/logger', 'guardrails'],
      exports: ['ToolRegistry', 'ToolExecutor', 'ToolInterface'],
    },
    {
      name: 'model-adapter',
      path: 'src/model-adapter',
      responsibility: 'Model provider abstraction — chat/complete/embed interface, message formatting, token counting',
      dependencies: ['core/config', 'core/errors', 'utils'],
      exports: ['ModelAdapter', 'MessageFormatter', 'TokenCounter', 'AnthropicProvider', 'OpenAIProvider', 'LocalProvider'],
    },
    {
      name: 'guardrails',
      path: 'src/guardrails',
      responsibility: 'Input/output safety checks — content filtering, token budget, tool permissions, schema validation',
      dependencies: ['core/errors', 'core/logger'],
      exports: ['GuardrailRunner', 'GuardrailInterface', 'ContentFilter', 'TokenBudget', 'ToolPermission', 'OutputSchema'],
    },
    {
      name: 'rag',
      path: 'src/rag',
      responsibility: 'Retrieval-augmented generation — document loading, chunking, embedding, retrieval, context augmentation',
      dependencies: ['model-adapter', 'memory', 'core/config'],
      exports: ['RagPipeline', 'TextLoader', 'JsonLoader', 'MarkdownLoader', 'FixedSizeChunker', 'RecursiveChunker', 'SimilarityRetriever'],
    },
    {
      name: 'agents',
      path: 'src/agents',
      responsibility: 'Agent presets and builder — composable agent configurations for common use cases',
      dependencies: ['orchestrator', 'planner', 'memory', 'tools', 'model-adapter'],
      exports: ['AgentBuilder', 'ResearchAgent', 'CodingAgent', 'ConversationalAgent'],
    },
    {
      name: 'prompts',
      path: 'src/prompts',
      responsibility: 'Prompt composition, template rendering, variable interpolation, few-shot examples',
      dependencies: [],
      exports: ['PromptBuilder', 'TemplateEngine'],
    },
    {
      name: 'core/errors',
      path: 'src/core/errors',
      responsibility: 'Agent-specific error types (PlanningError, ToolError, GuardrailError, ModelError)',
      dependencies: [],
      exports: ['AgentError', 'PlanningError', 'ToolError', 'GuardrailError', 'ModelError', 'ErrorCodes'],
    },
    {
      name: 'core/logger',
      path: 'src/core/logger',
      responsibility: 'Structured logging with run correlation IDs and step tracing',
      dependencies: ['core/config'],
      exports: ['Logger', 'createLogger'],
    },
    {
      name: 'core/config',
      path: 'src/core/config',
      responsibility: 'Configuration for model, tools, guardrails, memory, and agent presets',
      dependencies: [],
      exports: ['ConfigLoader'],
    },
    {
      name: 'core/events',
      path: 'src/core/events',
      responsibility: 'Event bus for agent lifecycle (plan:start, act:complete, reflect:done, etc.)',
      dependencies: [],
      exports: ['EventBus'],
    },
    {
      name: 'core/state',
      path: 'src/core/state',
      responsibility: 'Agent state machine (idle -> planning -> executing -> reflecting -> done/error)',
      dependencies: ['core/events'],
      exports: ['StateMachine'],
    },
    {
      name: 'utils',
      path: 'src/utils',
      responsibility: 'Retry logic, throttling, lenient JSON parsing, cost tracking',
      dependencies: [],
      exports: ['retry', 'throttle', 'parseJson', 'CostTracker'],
    },
  ],

  config: {
    files: [
      'config/default.json',
      'config/agents/research.json',
      'config/agents/coding.json',
      '.env.example',
    ],
    format: 'json',
  },

  integrations: [
    'claude-code',
    'anthropic-api',
    'openai-api',
    'github-actions',
    'vector-store',
  ],

  metadata: {
    estimatedFiles: 90,
    complexity: 'high',
    layers: ['orchestrator', 'planner', 'memory', 'tool', 'model-adapter', 'guardrail', 'config'],
  },
};

/**
 * Recommended blueprint fragments from the registry for an AI agent project.
 * @type {string[]}
 */
const recommendedFragments = [
  'error-handling',
  'logging',
  'config-system',
  'event-bus',
  'state-machine',
  'factory-pattern',
  'plugin-loader',
  'test-runner',
  'mock-system',
  'github-actions',
  'claude-md',
  'claude-settings',
  'claude-commands',
  'claude-hooks',
];

/**
 * Patterns recommended for AI agent frameworks.
 * @type {{name: string, description: string, reason: string}[]}
 */
const recommendedPatterns = [
  { name: 'Observe-Plan-Act-Reflect Loop', description: 'Core agent loop with distinct cognitive phases', reason: 'Separates perception, reasoning, action, and self-evaluation' },
  { name: 'Strategy Pattern', description: 'Swappable planning strategies (ReAct, CoT, ToT)', reason: 'Different tasks benefit from different reasoning approaches' },
  { name: 'Registry Pattern', description: 'Dynamic tool and provider registration', reason: 'Agents need extensible tool sets without core modifications' },
  { name: 'Chain of Responsibility', description: 'Sequential guardrail checks on input and output', reason: 'Safety checks must be composable and ordered' },
  { name: 'Builder Pattern', description: 'Fluent agent builder for composing custom agents', reason: 'Complex agent configuration with many optional components' },
  { name: 'Adapter Pattern', description: 'Uniform interface over multiple model providers', reason: 'Switch between Claude, GPT, local models without code changes' },
  { name: 'Memento Pattern', description: 'Checkpoint and restore agent state', reason: 'Enable pause/resume and debugging of long-running agent runs' },
];

export { aiAgentBlueprint, recommendedFragments, recommendedPatterns };
export default aiAgentBlueprint;
