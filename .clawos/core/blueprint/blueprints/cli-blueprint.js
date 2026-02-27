/**
 * @module CliBlueprint
 * @description Complete blueprint definition for CLI (Command-Line Interface) frameworks.
 * Covers argument parsing, command routing, interactive prompts, output formatting,
 * shell completions, plugin systems, and REPL modes.
 *
 * @author ClawOS Framework
 * @license MIT
 */

/**
 * @typedef {import('../blueprint-engine.js').Blueprint} Blueprint
 */

/**
 * Full CLI framework blueprint.
 * @type {Blueprint}
 */
const cliBlueprint = {
  name: 'cli-framework',
  description: 'Full-featured command-line interface framework with sub-commands, argument parsing, interactive prompts, output formatting, shell completions, and plugin support',
  archetype: 'cli',
  domain: 'cli',

  structure: {
    directories: [
      'src',
      'src/parser',
      'src/commands',
      'src/commands/built-in',
      'src/services',
      'src/output',
      'src/output/formatters',
      'src/prompts',
      'src/plugins',
      'src/core',
      'src/core/errors',
      'src/core/logger',
      'src/core/config',
      'src/core/events',
      'src/utils',
      'config',
      'docs',
      'docs/commands',
      'tests',
      'tests/unit',
      'tests/unit/parser',
      'tests/unit/commands',
      'tests/unit/output',
      'tests/integration',
      'tests/fixtures',
      'completions',
      'scripts',
      'bin',
      '.claude',
      '.claude/commands',
      '.github',
      '.github/workflows',
    ],

    files: [
      // ── Root ──
      { path: 'package.json', description: 'Package manifest with bin field pointing to CLI entry', template: 'package-json-cli' },
      { path: 'README.md', description: 'CLI usage guide, installation, command reference', template: 'readme' },
      { path: '.gitignore', description: 'Git ignore rules', template: 'gitignore' },

      // ── Bin ──
      { path: 'bin/cli.js', description: 'Executable entry point (#!/usr/bin/env node)', template: 'cli-bin' },

      // ── Entry ──
      { path: 'src/index.js', description: 'CLI application bootstrap — parse argv, route command, handle exit', template: 'cli-entry' },
      { path: 'src/app.js', description: 'Application class — initializes config, plugins, and command registry', template: 'cli-app' },

      // ── Parser ──
      { path: 'src/parser/index.js', description: 'Parser barrel export', template: 'barrel' },
      { path: 'src/parser/arg-parser.js', description: 'Tokenizer and parser for argv — flags, options, positional args, variadic', template: 'arg-parser' },
      { path: 'src/parser/option-definitions.js', description: 'Option / flag schema definitions (type, alias, default, required)', template: 'option-definitions' },
      { path: 'src/parser/command-registry.js', description: 'Command registration, lookup by name or alias, conflict detection', template: 'command-registry' },
      { path: 'src/parser/help-generator.js', description: 'Auto-generates formatted help text from command metadata', template: 'help-generator' },
      { path: 'src/parser/completions.js', description: 'Shell completion script generator (bash, zsh, fish)', template: 'completions' },
      { path: 'src/parser/validator.js', description: 'Validates parsed args against option schema (types, required, choices)', template: 'arg-validator' },

      // ── Commands ──
      { path: 'src/commands/index.js', description: 'Commands barrel export — registers all built-in commands', template: 'barrel' },
      { path: 'src/commands/base-command.js', description: 'Abstract command class — lifecycle hooks (validate, execute, cleanup)', template: 'base-command' },
      { path: 'src/commands/built-in/help.js', description: 'help command — displays usage for any command', template: 'cmd-help' },
      { path: 'src/commands/built-in/version.js', description: 'version command — prints semver from package.json', template: 'cmd-version' },
      { path: 'src/commands/built-in/init.js', description: 'init command — interactive project scaffolding wizard', template: 'cmd-init' },
      { path: 'src/commands/built-in/config.js', description: 'config command — get/set/list configuration values', template: 'cmd-config' },
      { path: 'src/commands/built-in/completion.js', description: 'completion command — installs shell completion scripts', template: 'cmd-completion' },

      // ── Services ──
      { path: 'src/services/index.js', description: 'Services barrel export', template: 'barrel' },
      { path: 'src/services/file-service.js', description: 'File I/O operations (read, write, template rendering)', template: 'file-service' },
      { path: 'src/services/template-service.js', description: 'Template interpolation engine for scaffolded files', template: 'template-service' },
      { path: 'src/services/process-service.js', description: 'Child process spawning with streaming stdout/stderr', template: 'process-service' },

      // ── Output ──
      { path: 'src/output/index.js', description: 'Output barrel export', template: 'barrel' },
      { path: 'src/output/printer.js', description: 'Unified print interface — respects --quiet, --json, --no-color', template: 'printer' },
      { path: 'src/output/spinner.js', description: 'Terminal spinner / progress indicator for long operations', template: 'spinner' },
      { path: 'src/output/table.js', description: 'ASCII / unicode table renderer for tabular data', template: 'table' },
      { path: 'src/output/formatters/json.js', description: 'JSON output formatter', template: 'formatter-json' },
      { path: 'src/output/formatters/text.js', description: 'Plain text output formatter', template: 'formatter-text' },
      { path: 'src/output/formatters/color.js', description: 'ANSI color helper (bold, red, green, dim, etc.)', template: 'formatter-color' },

      // ── Prompts ──
      { path: 'src/prompts/index.js', description: 'Prompts barrel export', template: 'barrel' },
      { path: 'src/prompts/prompt.js', description: 'Interactive prompt — text, confirm, select, multi-select, password', template: 'prompt' },
      { path: 'src/prompts/wizard.js', description: 'Multi-step wizard for guided workflows', template: 'wizard' },

      // ── Plugins ──
      { path: 'src/plugins/index.js', description: 'Plugin system barrel export', template: 'barrel' },
      { path: 'src/plugins/plugin-loader.js', description: 'Plugin discovery (node_modules, local dir) and loading', template: 'plugin-loader' },
      { path: 'src/plugins/plugin-manager.js', description: 'Plugin lifecycle — init, activate, deactivate, uninstall', template: 'plugin-manager' },
      { path: 'src/plugins/plugin-interface.js', description: 'Plugin contract / interface definition', template: 'plugin-interface' },

      // ── Core infrastructure ──
      { path: 'src/core/errors/cli-error.js', description: 'CLI-specific error class with exit code', template: 'cli-error' },
      { path: 'src/core/errors/error-codes.js', description: 'CLI error code constants (E_INVALID_ARG, E_MISSING_CMD, etc.)', template: 'cli-error-codes' },
      { path: 'src/core/errors/index.js', description: 'Errors barrel export', template: 'barrel' },
      { path: 'src/core/logger/logger.js', description: 'CLI logger (respects --verbose / --debug / --quiet)', template: 'cli-logger' },
      { path: 'src/core/logger/index.js', description: 'Logger barrel export', template: 'barrel' },
      { path: 'src/core/config/config-loader.js', description: 'Config from ~/.toolrc, project config, env vars', template: 'cli-config-loader' },
      { path: 'src/core/config/config-store.js', description: 'Persistent config store (read/write user preferences)', template: 'config-store' },
      { path: 'src/core/config/index.js', description: 'Config barrel export', template: 'barrel' },
      { path: 'src/core/events/event-bus.js', description: 'Event bus for command lifecycle events', template: 'event-bus' },
      { path: 'src/core/events/index.js', description: 'Events barrel export', template: 'barrel' },

      // ── Utils ──
      { path: 'src/utils/string.js', description: 'String utilities (pad, truncate, wrap, slugify)', template: 'string-utils' },
      { path: 'src/utils/fs.js', description: 'File system helpers (exists, ensureDir, tempDir)', template: 'fs-utils' },
      { path: 'src/utils/index.js', description: 'Utils barrel export', template: 'barrel' },

      // ── Config ──
      { path: 'config/default.json', description: 'Default CLI configuration', template: 'config-default' },

      // ── Completions ──
      { path: 'completions/bash.sh', description: 'Bash completion script', template: 'completion-bash' },
      { path: 'completions/zsh.sh', description: 'Zsh completion script', template: 'completion-zsh' },
      { path: 'completions/fish.sh', description: 'Fish completion script', template: 'completion-fish' },

      // ── Tests ──
      { path: 'tests/setup.js', description: 'Test harness setup', template: 'test-setup' },
      { path: 'tests/unit/parser/arg-parser.test.js', description: 'Argument parser unit tests', template: 'test-unit' },
      { path: 'tests/unit/commands/help.test.js', description: 'Help command unit tests', template: 'test-unit' },
      { path: 'tests/unit/output/printer.test.js', description: 'Printer unit tests', template: 'test-unit' },
      { path: 'tests/integration/cli.test.js', description: 'End-to-end CLI integration tests', template: 'test-integration' },
      { path: 'tests/fixtures/sample-args.json', description: 'Sample argv fixtures', template: 'fixture-args' },

      // ── Claude Code ──
      { path: 'CLAUDE.md', description: 'Claude Code project context — CLI architecture, command patterns, conventions', template: 'claude-md' },
      { path: '.claude/settings.json', description: 'Claude Code tool permissions', template: 'claude-settings' },
      { path: '.claude/commands/review.md', description: '/review — automated code review', template: 'claude-cmd-review' },
      { path: '.claude/commands/test.md', description: '/test — run tests and report', template: 'claude-cmd-test' },
      { path: '.claude/commands/add-command.md', description: '/add-command — scaffold a new CLI command', template: 'claude-cmd-add-command' },

      // ── CI ──
      { path: '.github/workflows/ci.yml', description: 'CI pipeline (lint, test, build)', template: 'github-actions-ci' },

      // ── Scripts ──
      { path: 'scripts/build-completions.js', description: 'Generates shell completion scripts from command registry', template: 'build-completions' },
    ],
  },

  modules: [
    {
      name: 'parser',
      path: 'src/parser',
      responsibility: 'Tokenize argv, parse flags/options/positionals, validate input, generate help text',
      dependencies: ['core/errors'],
      exports: ['ArgParser', 'CommandRegistry', 'HelpGenerator', 'Completions'],
    },
    {
      name: 'commands',
      path: 'src/commands',
      responsibility: 'Command definitions, lifecycle hooks (validate, execute, cleanup), built-in commands',
      dependencies: ['parser', 'services', 'output', 'core/errors'],
      exports: ['BaseCommand', 'HelpCommand', 'VersionCommand', 'InitCommand', 'ConfigCommand'],
    },
    {
      name: 'services',
      path: 'src/services',
      responsibility: 'Business logic — file operations, templating, child process management',
      dependencies: ['core/config', 'core/logger'],
      exports: ['FileService', 'TemplateService', 'ProcessService'],
    },
    {
      name: 'output',
      path: 'src/output',
      responsibility: 'Terminal output — printing, spinners, tables, colored text, JSON mode',
      dependencies: ['core/config'],
      exports: ['Printer', 'Spinner', 'Table', 'formatters'],
    },
    {
      name: 'prompts',
      path: 'src/prompts',
      responsibility: 'Interactive terminal prompts and multi-step wizards',
      dependencies: ['output'],
      exports: ['Prompt', 'Wizard'],
    },
    {
      name: 'plugins',
      path: 'src/plugins',
      responsibility: 'Plugin discovery, loading, lifecycle management, sandboxing',
      dependencies: ['core/events', 'core/config', 'parser'],
      exports: ['PluginLoader', 'PluginManager', 'PluginInterface'],
    },
    {
      name: 'core/errors',
      path: 'src/core/errors',
      responsibility: 'CLI error types with exit codes and user-friendly messages',
      dependencies: [],
      exports: ['CliError', 'ErrorCodes'],
    },
    {
      name: 'core/logger',
      path: 'src/core/logger',
      responsibility: 'Logging that respects --verbose / --debug / --quiet flags',
      dependencies: ['core/config'],
      exports: ['Logger', 'createLogger'],
    },
    {
      name: 'core/config',
      path: 'src/core/config',
      responsibility: 'Configuration from rc files, project config, and environment variables',
      dependencies: [],
      exports: ['ConfigLoader', 'ConfigStore'],
    },
    {
      name: 'core/events',
      path: 'src/core/events',
      responsibility: 'Event bus for command lifecycle and plugin hooks',
      dependencies: [],
      exports: ['EventBus'],
    },
    {
      name: 'utils',
      path: 'src/utils',
      responsibility: 'Shared string and file system utilities',
      dependencies: [],
      exports: ['stringUtils', 'fsUtils'],
    },
  ],

  config: {
    files: [
      'config/default.json',
    ],
    format: 'json',
  },

  integrations: [
    'claude-code',
    'github-actions',
    'shell-completions',
  ],

  metadata: {
    estimatedFiles: 58,
    complexity: 'low',
    layers: ['parser', 'command', 'service', 'output', 'config'],
  },
};

/**
 * Recommended blueprint fragments from the registry for a CLI project.
 * @type {string[]}
 */
const recommendedFragments = [
  'error-handling',
  'logging',
  'config-system',
  'cli-parser',
  'slash-commands',
  'plugin-loader',
  'event-bus',
  'test-runner',
  'github-actions',
  'claude-md',
  'claude-settings',
  'claude-commands',
];

/**
 * Patterns recommended for CLI frameworks.
 * @type {{name: string, description: string, reason: string}[]}
 */
const recommendedPatterns = [
  { name: 'Command Pattern', description: 'Encapsulate each CLI action as a command object with execute/undo', reason: 'Clean separation of commands, easy to add new commands' },
  { name: 'Plugin Architecture', description: 'Third-party commands loaded dynamically', reason: 'Extensibility without modifying core' },
  { name: 'Strategy Pattern', description: 'Swappable output formatters (json, text, table)', reason: 'Support multiple output modes with --json, --table flags' },
  { name: 'Chain of Responsibility', description: 'Middleware-like hooks (pre-run, post-run, on-error)', reason: 'Cross-cutting concerns like telemetry and logging' },
  { name: 'Template Method', description: 'BaseCommand defines lifecycle, subclasses implement steps', reason: 'Consistent command lifecycle across all commands' },
];

export { cliBlueprint, recommendedFragments, recommendedPatterns };
export default cliBlueprint;
