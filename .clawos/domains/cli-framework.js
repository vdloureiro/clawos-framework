/**
 * @module domains/cli-framework
 * @description Domain knowledge for CLI tool framework generation.
 */

const CLI_FRAMEWORK_DOMAIN = {
  id: 'cli',
  name: 'CLI Tool Framework',
  description: 'Frameworks for building command-line interfaces, developer tools, and terminal applications',

  coreConcepts: [
    'argument-parsing',
    'command-routing',
    'subcommands',
    'flags-and-options',
    'help-generation',
    'output-formatting',
    'interactive-prompts',
    'progress-indicators',
    'configuration',
    'plugin-system',
    'shell-completion',
    'error-reporting',
  ],

  architecturalStyles: {
    single: {
      name: 'Single Command CLI',
      description: 'One primary action with flags/options (e.g., curl, wget)',
      patterns: ['argument-parser', 'option-builder', 'output-formatter'],
    },
    multi: {
      name: 'Multi-Command CLI',
      description: 'Multiple subcommands (e.g., git, npm, docker)',
      patterns: ['command-router', 'subcommand-tree', 'plugin-loader'],
    },
    interactive: {
      name: 'Interactive CLI',
      description: 'Terminal UI with prompts and menus (e.g., yeoman, inquirer)',
      patterns: ['prompt-engine', 'wizard-flow', 'form-builder'],
    },
    daemon: {
      name: 'CLI with Daemon',
      description: 'CLI that manages a background service (e.g., pm2, docker)',
      patterns: ['process-manager', 'ipc-channel', 'pid-file'],
    },
  },

  directoryStructure: {
    src: {
      commands: 'Command definitions — one file per command/subcommand',
      flags: 'Flag and option definitions',
      prompts: 'Interactive prompt flows',
      formatters: 'Output formatters (table, json, yaml, plain)',
      plugins: 'Plugin loader and registry',
      utils: 'Shared utilities',
      config: 'Configuration management (~/.toolrc)',
      'index.js': 'Entry point — parses args and dispatches commands',
      'cli.js': 'CLI runner with process handling',
    },
    tests: {
      commands: 'Tests for each command',
      integration: 'Full CLI integration tests',
    },
    bin: 'Executable entry scripts',
  },

  requiredModules: [
    {
      name: 'Argument Parser',
      responsibility: 'Parse process.argv into structured commands, flags, and arguments',
      interface: {
        methods: ['parse(argv)', 'command(name, config)', 'option(flag, config)', 'getHelp()'],
      },
    },
    {
      name: 'Command Router',
      responsibility: 'Map parsed commands to handler functions',
      interface: {
        methods: ['register(name, handler, options)', 'dispatch(parsed)', 'getCommand(name)', 'listCommands()'],
      },
    },
    {
      name: 'Output Formatter',
      responsibility: 'Format output for terminal (tables, colors, JSON, progress bars)',
      interface: {
        methods: ['table(data, columns)', 'json(data)', 'success(msg)', 'error(msg)', 'warn(msg)', 'progress(total)', 'spinner(text)'],
      },
    },
    {
      name: 'Help Generator',
      responsibility: 'Auto-generate help text from command/option definitions',
      interface: {
        methods: ['generate(commands)', 'forCommand(name)', 'version()', 'usage()'],
      },
    },
    {
      name: 'Config Manager',
      responsibility: 'Read/write user configuration (~/.toolrc, .toolrc.json)',
      interface: {
        methods: ['load()', 'get(key)', 'set(key, value)', 'save()', 'reset()'],
      },
    },
  ],

  optionalModules: [
    { name: 'Interactive Prompts', triggers: ['prompt', 'interactive', 'wizard', 'inquirer'], provides: ['text input', 'select', 'multi-select', 'confirm', 'password'] },
    { name: 'Plugin System', triggers: ['plugin', 'extension', 'addon'], provides: ['plugin loader', 'plugin registry', 'hook system'] },
    { name: 'Shell Completion', triggers: ['completion', 'autocomplete', 'tab'], provides: ['bash completion', 'zsh completion', 'fish completion'] },
    { name: 'Update Notifier', triggers: ['update', 'version-check', 'auto-update'], provides: ['npm version check', 'update prompt'] },
    { name: 'Telemetry', triggers: ['telemetry', 'analytics', 'tracking'], provides: ['opt-in analytics', 'error reporting'] },
  ],

  referenceFrameworks: [
    { name: 'Commander.js', style: 'declarative', strength: 'simple + popular' },
    { name: 'Oclif', style: 'enterprise', strength: 'plugins + testing' },
    { name: 'Yargs', style: 'fluent-api', strength: 'powerful parsing' },
    { name: 'CAC', style: 'minimal', strength: 'lightweight + fast' },
    { name: 'Cliffy', style: 'modern', strength: 'Deno-native + rich UI' },
  ],

  codePatterns: {
    argParser: `
export class ArgParser {
  constructor() {
    this.commands = new Map();
    this.globalOptions = [];
  }

  command(name, description) {
    const cmd = { name, description, options: [], args: [], handler: null };
    this.commands.set(name, cmd);
    return {
      option: (flag, desc, config = {}) => { cmd.options.push({ flag, desc, ...config }); return this; },
      argument: (name, desc, config = {}) => { cmd.args.push({ name, desc, ...config }); return this; },
      action: (fn) => { cmd.handler = fn; return this; },
    };
  }

  parse(argv = process.argv.slice(2)) {
    const [commandName, ...rest] = argv;
    const cmd = this.commands.get(commandName);
    if (!cmd) return { command: null, args: argv, options: {} };
    return { command: commandName, args: rest.filter(a => !a.startsWith('-')), options: this._parseFlags(rest, cmd.options) };
  }
}`,
    commandRouter: `
export class CommandRouter {
  #commands = new Map();

  register(name, handler, meta = {}) {
    this.#commands.set(name, { handler, ...meta });
  }

  async dispatch(parsed) {
    const cmd = this.#commands.get(parsed.command);
    if (!cmd) throw new Error(\`Unknown command: \${parsed.command}. Run with --help for usage.\`);
    return cmd.handler(parsed.args, parsed.options);
  }
}`,
  },

  testingStrategies: {
    unit: ['Test argument parsing with various inputs', 'Test each command handler independently', 'Test flag combinations', 'Test config read/write'],
    integration: ['Test full CLI invocation via child_process', 'Test piped input/output', 'Test exit codes'],
  },
};

export default CLI_FRAMEWORK_DOMAIN;
