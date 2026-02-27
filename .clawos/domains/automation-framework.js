/**
 * @module domains/automation-framework
 * @description Domain knowledge for Workflow Automation framework generation.
 */

const AUTOMATION_FRAMEWORK_DOMAIN = {
  id: 'automation',
  name: 'Automation / Workflow Framework',
  description: 'Frameworks for task automation, workflow engines, CI/CD tools, and process orchestration',

  coreConcepts: [
    'workflow-definition',
    'task-execution',
    'dependency-graph',
    'trigger-system',
    'retry-logic',
    'parallel-execution',
    'conditional-branching',
    'variable-passing',
    'logging-audit',
    'scheduling',
    'notification',
    'rollback',
  ],

  architecturalStyles: {
    dag: {
      name: 'DAG-Based Workflow',
      description: 'Directed Acyclic Graph of tasks with dependencies (Airflow style)',
      patterns: ['dag-builder', 'task-node', 'dependency-resolver', 'topological-sort'],
    },
    sequential: {
      name: 'Sequential Pipeline',
      description: 'Linear step-by-step execution (GitHub Actions style)',
      patterns: ['step-runner', 'job-container', 'matrix-strategy'],
    },
    event: {
      name: 'Event-Driven Automation',
      description: 'Trigger-based workflows (Zapier, n8n style)',
      patterns: ['trigger', 'action', 'connector', 'event-router'],
    },
    rule: {
      name: 'Rule-Based Engine',
      description: 'If-then rules engine for automation decisions',
      patterns: ['rule-definition', 'condition-evaluator', 'action-executor', 'rule-chain'],
    },
  },

  directoryStructure: {
    src: {
      engine: 'Workflow engine — parse, validate, execute workflows',
      tasks: 'Task definitions and built-in tasks',
      triggers: 'Trigger system — file watch, cron, webhook, event',
      runners: 'Task runners — local, docker, remote',
      scheduler: 'Job scheduling — cron, interval, dependency-based',
      connectors: 'External service connectors',
      notifications: 'Notification system — email, slack, webhook',
      utils: 'Utility functions',
      'index.js': 'Public API',
    },
  },

  requiredModules: [
    {
      name: 'Workflow Engine',
      responsibility: 'Parse workflow definitions and orchestrate execution',
      interface: {
        methods: ['loadWorkflow(definition)', 'execute(workflowId, inputs)', 'pause(runId)', 'resume(runId)', 'cancel(runId)', 'getStatus(runId)'],
      },
    },
    {
      name: 'Task Runner',
      responsibility: 'Execute individual tasks with isolation and timeout',
      interface: {
        methods: ['run(task, context)', 'setTimeout(ms)', 'getOutput()', 'onProgress(callback)'],
      },
    },
    {
      name: 'Dependency Resolver',
      responsibility: 'Resolve task execution order from dependency graph',
      interface: {
        methods: ['addTask(id, dependencies)', 'resolve()', 'getExecutionOrder()', 'detectCycles()', 'getParallelGroups()'],
      },
    },
    {
      name: 'Trigger System',
      responsibility: 'Listen for events and trigger workflow execution',
      interface: {
        methods: ['register(trigger, workflowId)', 'start()', 'stop()', 'emit(event, data)'],
      },
    },
  ],

  optionalModules: [
    { name: 'Scheduler', triggers: ['schedule', 'cron', 'periodic', 'timer'], provides: ['cron expressions', 'interval scheduling', 'calendar scheduling'] },
    { name: 'Docker Runner', triggers: ['docker', 'container', 'isolated'], provides: ['container execution', 'image management', 'volume mounting'] },
    { name: 'Notifications', triggers: ['notify', 'alert', 'email', 'slack'], provides: ['email alerts', 'Slack webhooks', 'custom notifications'] },
    { name: 'Dashboard', triggers: ['dashboard', 'ui', 'monitor', 'web'], provides: ['web dashboard', 'run history', 'real-time status'] },
    { name: 'Secret Management', triggers: ['secret', 'vault', 'credential', 'env'], provides: ['encrypted secrets', 'environment injection', 'vault integration'] },
  ],

  referenceFrameworks: [
    { name: 'Apache Airflow', style: 'dag-based', strength: 'mature + scalable' },
    { name: 'GitHub Actions', style: 'yaml-pipeline', strength: 'CI/CD native' },
    { name: 'n8n', style: 'visual-workflow', strength: 'no-code + connectors' },
    { name: 'Temporal', style: 'durable-execution', strength: 'fault-tolerant' },
    { name: 'Gulp', style: 'task-runner', strength: 'simple + streams' },
  ],

  codePatterns: {
    workflowEngine: `
export class WorkflowEngine {
  #workflows = new Map();
  #runs = new Map();

  register(id, definition) {
    const validated = this.#validate(definition);
    this.#workflows.set(id, validated);
  }

  async execute(workflowId, inputs = {}) {
    const workflow = this.#workflows.get(workflowId);
    if (!workflow) throw new Error(\`Workflow not found: \${workflowId}\`);
    const runId = crypto.randomUUID();
    const run = { id: runId, workflowId, status: 'running', inputs, outputs: {}, startedAt: Date.now() };
    this.#runs.set(runId, run);

    const order = this.#resolveOrder(workflow.tasks);
    for (const taskId of order) {
      const task = workflow.tasks[taskId];
      const context = { ...inputs, ...run.outputs };
      run.outputs[taskId] = await this.#executeTask(task, context);
    }

    run.status = 'completed';
    run.completedAt = Date.now();
    return run;
  }
}`,
    dagResolver: `
export function topologicalSort(tasks) {
  const visited = new Set();
  const result = [];
  const visiting = new Set();

  function visit(id) {
    if (visiting.has(id)) throw new Error(\`Circular dependency detected: \${id}\`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of tasks[id]?.dependencies || []) visit(dep);
    visiting.delete(id);
    visited.add(id);
    result.push(id);
  }

  for (const id of Object.keys(tasks)) visit(id);
  return result;
}`,
  },

  testingStrategies: {
    unit: ['Test workflow parsing and validation', 'Test dependency resolution', 'Test individual task execution', 'Test trigger registration'],
    integration: ['Test full workflow execution', 'Test error recovery and retry', 'Test parallel task execution', 'Test conditional branching'],
  },
};

export default AUTOMATION_FRAMEWORK_DOMAIN;
