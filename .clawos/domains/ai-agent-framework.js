/**
 * @module domains/ai-agent-framework
 * @description Domain knowledge for AI Agent/Multi-Agent framework generation.
 */

const AI_AGENT_FRAMEWORK_DOMAIN = {
  id: 'ai-agent',
  name: 'AI Agent Framework',
  description: 'Frameworks for building AI agents, multi-agent systems, tool-calling agents, and LLM orchestration',

  coreConcepts: [
    'agent-definition',
    'tool-calling',
    'memory-system',
    'planning',
    'reasoning-loop',
    'multi-agent-coordination',
    'prompt-management',
    'context-window',
    'tool-registry',
    'guardrails',
    'observability',
    'human-in-the-loop',
  ],

  architecturalStyles: {
    single: {
      name: 'Single Agent',
      description: 'One agent with tools (ReAct pattern, function-calling)',
      patterns: ['react-loop', 'tool-registry', 'memory-store', 'prompt-template'],
    },
    multi: {
      name: 'Multi-Agent Orchestration',
      description: 'Multiple specialized agents coordinated by an orchestrator (CrewAI, AutoGen style)',
      patterns: ['agent-registry', 'task-dispatcher', 'message-passing', 'consensus'],
    },
    pipeline: {
      name: 'Agent Pipeline',
      description: 'Sequential agent chain where each agent refines the output (LangChain style)',
      patterns: ['chain', 'sequential-agent', 'router-agent', 'parallel-agent'],
    },
    swarm: {
      name: 'Agent Swarm',
      description: 'Decentralized agents with handoff protocols (OpenAI Swarm style)',
      patterns: ['handoff', 'routine', 'context-transfer', 'swarm-coordinator'],
    },
  },

  directoryStructure: {
    src: {
      agents: 'Agent definitions — persona, instructions, tools, constraints',
      tools: 'Tool definitions — function signatures, implementations',
      memory: 'Memory system — short-term, long-term, vector store',
      prompts: 'Prompt templates and management',
      orchestrator: 'Multi-agent orchestration — task dispatch, coordination',
      guardrails: 'Safety rails — input/output validation, content filtering',
      providers: 'LLM provider adapters — OpenAI, Anthropic, local models',
      observability: 'Tracing, logging, metrics for agent runs',
      utils: 'Utility functions',
      'index.js': 'Public API',
    },
  },

  requiredModules: [
    {
      name: 'Agent Runtime',
      responsibility: 'Execute agent reasoning loops — observe, think, act, reflect',
      interface: {
        methods: ['createAgent(config)', 'run(agent, input)', 'step(agent)', 'getHistory(agent)', 'stop(agent)'],
      },
    },
    {
      name: 'Tool Registry',
      responsibility: 'Register, discover, and invoke tools for agents',
      interface: {
        methods: ['register(tool)', 'invoke(toolName, params)', 'getSchema(toolName)', 'listTools()', 'getForAgent(agentId)'],
      },
    },
    {
      name: 'Memory System',
      responsibility: 'Store and retrieve agent memory — conversations, facts, context',
      interface: {
        methods: ['store(key, value, metadata)', 'retrieve(query, options)', 'getRecent(n)', 'clear()', 'summarize()'],
      },
    },
    {
      name: 'Prompt Manager',
      responsibility: 'Manage prompt templates with variable injection and versioning',
      interface: {
        methods: ['register(name, template)', 'render(name, variables)', 'compose(templates)', 'getTokenCount(prompt)'],
      },
    },
    {
      name: 'LLM Provider',
      responsibility: 'Abstract interface to LLM APIs — chat, completion, embeddings',
      interface: {
        methods: ['chat(messages, options)', 'complete(prompt, options)', 'embed(text)', 'streamChat(messages, options)'],
      },
    },
  ],

  optionalModules: [
    { name: 'Multi-Agent Coordinator', triggers: ['multi-agent', 'crew', 'team', 'swarm', 'orchestrate'], provides: ['task dispatch', 'agent handoff', 'consensus', 'parallel execution'] },
    { name: 'Vector Memory', triggers: ['vector', 'embedding', 'semantic', 'rag'], provides: ['vector store', 'semantic search', 'RAG pipeline'] },
    { name: 'Guardrails', triggers: ['safety', 'guardrail', 'filter', 'validation', 'moderation'], provides: ['input validation', 'output filtering', 'content moderation', 'PII detection'] },
    { name: 'Tracing', triggers: ['trace', 'observability', 'debug', 'langsmith'], provides: ['run tracing', 'step logging', 'cost tracking', 'latency metrics'] },
    { name: 'Human-in-the-Loop', triggers: ['human', 'approval', 'review', 'confirmation'], provides: ['approval workflow', 'human feedback', 'correction loop'] },
  ],

  referenceFrameworks: [
    { name: 'LangChain', style: 'chain-based', strength: 'ecosystem + integrations' },
    { name: 'CrewAI', style: 'multi-agent', strength: 'role-based agents' },
    { name: 'AutoGen', style: 'conversational', strength: 'agent conversations' },
    { name: 'OpenAI Swarm', style: 'handoff', strength: 'lightweight + simple' },
    { name: 'Claude Agent SDK', style: 'tool-use', strength: 'native tool calling' },
  ],

  codePatterns: {
    agentLoop: `
export async function runAgent(agent, input, options = {}) {
  const maxIterations = options.maxIterations || 10;
  const messages = [{ role: 'system', content: agent.systemPrompt }, { role: 'user', content: input }];

  for (let i = 0; i < maxIterations; i++) {
    const response = await agent.provider.chat(messages, { tools: agent.tools });

    if (response.toolCalls?.length) {
      for (const call of response.toolCalls) {
        const result = await agent.toolRegistry.invoke(call.name, call.params);
        messages.push({ role: 'assistant', content: null, toolCalls: [call] });
        messages.push({ role: 'tool', toolCallId: call.id, content: JSON.stringify(result) });
      }
    } else {
      return { output: response.content, messages, iterations: i + 1 };
    }
  }
  throw new Error('Agent exceeded max iterations');
}`,
    toolDefinition: `
export function defineTool(config) {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters, // JSON Schema
    execute: config.execute,        // async (params) => result
    toSchema() {
      return {
        type: 'function',
        function: { name: this.name, description: this.description, parameters: this.parameters }
      };
    }
  };
}`,
  },

  testingStrategies: {
    unit: ['Test tool execution independently', 'Test prompt rendering', 'Test memory store/retrieve', 'Test agent config validation'],
    integration: ['Test full agent loop with mock LLM', 'Test multi-agent handoff', 'Test tool chain execution'],
  },
};

export default AI_AGENT_FRAMEWORK_DOMAIN;
