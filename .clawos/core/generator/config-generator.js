/**
 * @fileoverview ConfigGenerator — Generates configuration files for ClawOS.
 *
 * Produces content strings for:
 *  - JSON, YAML, and TOML configuration files
 *  - Environment files (.env, .env.example)
 *  - .gitignore
 *  - tsconfig.json / jsconfig.json
 *  - ESLint and Prettier configs
 *  - Dockerfiles and docker-compose.yml
 *  - GitHub Actions workflows
 *  - Editor configs (.editorconfig, .vscode/settings.json)
 *
 * All methods return strings — no I/O is performed here.
 *
 * @module generator/config-generator
 * @author ClawOS Framework
 * @license MIT
 */

// =============================================================================
// Type definitions
// =============================================================================

/**
 * @typedef {Object} ConfigProfile
 * @property {string}  name               - Project / framework name.
 * @property {string}  [description]
 * @property {string}  [version]
 * @property {string}  [author]
 * @property {string}  [license]
 * @property {string}  [domain]           - e.g. "api", "cli"
 * @property {string}  [archetype]
 * @property {'javascript'|'typescript'|'python'} [language]
 * @property {number}  [port]             - Default server port (API domain).
 * @property {string}  [nodeVersion]      - Node.js engine constraint.
 * @property {boolean} [useDocker]
 * @property {boolean} [useGitHubActions]
 * @property {boolean} [useTypescript]
 * @property {boolean} [usePrettier]
 * @property {boolean} [useEslint]
 * @property {string[]} [envVars]         - Environment variable names.
 * @property {string[]} [features]
 */

/**
 * @typedef {Object} GeneratedConfig
 * @property {string} path     - Relative file path (e.g. ".gitignore").
 * @property {string} content  - File content.
 */

/**
 * Supported config types.
 * @typedef {'gitignore'|'env'|'env-example'|'tsconfig'|'jsconfig'|'eslint'|'prettier'|'editorconfig'|'vscode'|'dockerfile'|'docker-compose'|'github-actions'|'json'|'yaml'|'toml'} ConfigType
 */

// =============================================================================
// Internal serializers (no external deps)
// =============================================================================

/**
 * Serialize a plain object to a minimal YAML string.
 * Handles nested objects, arrays, strings, numbers, and booleans.
 *
 * @param {*} data
 * @param {number} [indent=0]
 * @returns {string}
 */
function toYaml(data, indent = 0) {
  const pad = ' '.repeat(indent);

  if (data === null || data === undefined) return `${pad}null\n`;
  if (typeof data === 'boolean') return `${pad}${data}\n`;
  if (typeof data === 'number') return `${pad}${data}\n`;
  if (typeof data === 'string') {
    // Quote strings that could be misinterpreted.
    if (/[:{}\[\],&*?|>!%#@`]/.test(data) || data === '' || data === 'true' || data === 'false') {
      return `${pad}'${data.replace(/'/g, "''")}'\n`;
    }
    return `${pad}${data}\n`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}[]\n`;
    let out = '';
    for (const item of data) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const entries = Object.entries(item);
        out += `${pad}- ${entries[0][0]}: ${String(entries[0][1]).trim()}\n`;
        for (let i = 1; i < entries.length; i++) {
          out += `${pad}  ${entries[i][0]}: ${String(entries[i][1]).trim()}\n`;
        }
      } else {
        out += `${pad}- ${String(item).trim()}\n`;
      }
    }
    return out;
  }

  if (typeof data === 'object') {
    let out = '';
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
        out += `${pad}${key}:\n`;
        out += toYaml(value, indent + 2);
      } else if (Array.isArray(value)) {
        out += `${pad}${key}:\n`;
        out += toYaml(value, indent + 2);
      } else {
        out += `${pad}${key}: ${toYaml(value, 0).trim()}\n`;
      }
    }
    return out;
  }

  return `${pad}${String(data)}\n`;
}

/**
 * Serialize a plain object to a minimal TOML string.
 *
 * @param {Object} data
 * @param {string} [prefix='']
 * @returns {string}
 */
function toToml(data, prefix = '') {
  let out = '';
  const tables = [];

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const tableKey = prefix ? `${prefix}.${key}` : key;
      tables.push({ key: tableKey, value });
    } else if (Array.isArray(value)) {
      out += `${key} = [${value.map((v) => (typeof v === 'string' ? `"${v}"` : String(v))).join(', ')}]\n`;
    } else if (typeof value === 'string') {
      out += `${key} = "${value}"\n`;
    } else if (typeof value === 'boolean') {
      out += `${key} = ${value}\n`;
    } else if (typeof value === 'number') {
      out += `${key} = ${value}\n`;
    }
  }

  for (const table of tables) {
    out += `\n[${table.key}]\n`;
    out += toToml(table.value, table.key);
  }

  return out;
}

// =============================================================================
// Config template library
// =============================================================================

/** @type {Record<ConfigType, (profile: ConfigProfile) => GeneratedConfig>} */
const CONFIG_TEMPLATES = {
  // ---------------------------------------------------------------------------
  // .gitignore
  // ---------------------------------------------------------------------------
  gitignore(profile) {
    const lines = [
      '# Dependencies',
      'node_modules/',
      '',
      '# Build output',
      'dist/',
      'build/',
      'out/',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '.env.*.local',
      '',
      '# IDE / Editor',
      '.idea/',
      '.vscode/*',
      '!.vscode/settings.json',
      '!.vscode/extensions.json',
      '*.swp',
      '*.swo',
      '*~',
      '.DS_Store',
      '',
      '# Logs',
      'logs/',
      '*.log',
      'npm-debug.log*',
      '',
      '# Coverage',
      'coverage/',
      '.nyc_output/',
      '',
      '# Temporary',
      'tmp/',
      '.cache/',
    ];

    if (profile.useTypescript) {
      lines.push('', '# TypeScript', '*.tsbuildinfo');
    }
    if (profile.useDocker) {
      lines.push('', '# Docker', '.docker/');
    }

    lines.push('');
    return { path: '.gitignore', content: lines.join('\n') };
  },

  // ---------------------------------------------------------------------------
  // .env
  // ---------------------------------------------------------------------------
  env(profile) {
    const lines = [
      `# ${profile.name || 'Application'} Environment Variables`,
      `# Generated by ClawOS Framework`,
      '',
      `NODE_ENV=development`,
    ];

    if (profile.domain === 'api') {
      lines.push(`PORT=${profile.port || 3000}`);
      lines.push(`HOST=0.0.0.0`);
    }

    lines.push(`LOG_LEVEL=info`);

    if (profile.envVars?.length) {
      lines.push('');
      for (const envVar of profile.envVars) {
        lines.push(`${envVar}=`);
      }
    }

    lines.push('');
    return { path: '.env', content: lines.join('\n') };
  },

  // ---------------------------------------------------------------------------
  // .env.example
  // ---------------------------------------------------------------------------
  'env-example'(profile) {
    const lines = [
      `# ${profile.name || 'Application'} Environment Variables`,
      `# Copy this file to .env and fill in the values`,
      '',
      `NODE_ENV=development`,
    ];

    if (profile.domain === 'api') {
      lines.push(`PORT=${profile.port || 3000}`);
      lines.push(`HOST=0.0.0.0`);
    }

    lines.push(`LOG_LEVEL=info`);

    if (profile.envVars?.length) {
      lines.push('');
      for (const envVar of profile.envVars) {
        lines.push(`# ${envVar} — describe what this variable is for`);
        lines.push(`${envVar}=`);
      }
    }

    lines.push('');
    return { path: '.env.example', content: lines.join('\n') };
  },

  // ---------------------------------------------------------------------------
  // tsconfig.json
  // ---------------------------------------------------------------------------
  tsconfig(profile) {
    const config = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', 'tests'],
    };

    return {
      path: 'tsconfig.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  },

  // ---------------------------------------------------------------------------
  // jsconfig.json
  // ---------------------------------------------------------------------------
  jsconfig(profile) {
    const config = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        checkJs: true,
        strict: true,
        baseUrl: '.',
        paths: {
          '#src/*': ['./src/*'],
        },
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    return {
      path: 'jsconfig.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  },

  // ---------------------------------------------------------------------------
  // ESLint config
  // ---------------------------------------------------------------------------
  eslint(profile) {
    const config = {
      env: {
        node: true,
        es2022: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      extends: ['eslint:recommended'],
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off',
        'prefer-const': 'error',
        'no-var': 'error',
        eqeqeq: ['error', 'always'],
        curly: ['error', 'multi-line'],
      },
    };

    if (profile.useTypescript) {
      config.parser = '@typescript-eslint/parser';
      config.plugins = ['@typescript-eslint'];
      config.extends.push('plugin:@typescript-eslint/recommended');
    }

    return {
      path: '.eslintrc.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  },

  // ---------------------------------------------------------------------------
  // Prettier config
  // ---------------------------------------------------------------------------
  prettier(profile) {
    const config = {
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      bracketSpacing: true,
      arrowParens: 'always',
      endOfLine: 'lf',
    };

    return {
      path: '.prettierrc.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  },

  // ---------------------------------------------------------------------------
  // .editorconfig
  // ---------------------------------------------------------------------------
  editorconfig(profile) {
    const lines = [
      '# EditorConfig — https://editorconfig.org',
      '',
      'root = true',
      '',
      '[*]',
      'charset = utf-8',
      'end_of_line = lf',
      'indent_style = space',
      'indent_size = 2',
      'insert_final_newline = true',
      'trim_trailing_whitespace = true',
      '',
      '[*.md]',
      'trim_trailing_whitespace = false',
      '',
      '[Makefile]',
      'indent_style = tab',
      '',
    ];

    return { path: '.editorconfig', content: lines.join('\n') };
  },

  // ---------------------------------------------------------------------------
  // .vscode/settings.json
  // ---------------------------------------------------------------------------
  vscode(profile) {
    const settings = {
      'editor.formatOnSave': true,
      'editor.tabSize': 2,
      'editor.insertSpaces': true,
      'editor.defaultFormatter': profile.usePrettier
        ? 'esbenp.prettier-vscode'
        : undefined,
      'files.trimTrailingWhitespace': true,
      'files.insertFinalNewline': true,
      'files.exclude': {
        'node_modules/': true,
        'dist/': true,
        'coverage/': true,
      },
      'search.exclude': {
        'node_modules': true,
        'dist': true,
        'coverage': true,
      },
    };

    // Remove undefined values
    for (const key of Object.keys(settings)) {
      if (settings[key] === undefined) delete settings[key];
    }

    return {
      path: '.vscode/settings.json',
      content: JSON.stringify(settings, null, 2) + '\n',
    };
  },

  // ---------------------------------------------------------------------------
  // Dockerfile
  // ---------------------------------------------------------------------------
  dockerfile(profile) {
    const nodeVersion = profile.nodeVersion || '20';
    const port = profile.port || 3000;
    const name = profile.name || 'app';

    const lines = [
      `# ---- Build Stage ----`,
      `FROM node:${nodeVersion}-alpine AS builder`,
      '',
      'WORKDIR /app',
      '',
      '# Install dependencies first (layer caching)',
      'COPY package*.json ./',
      'RUN npm ci --production=false',
      '',
      '# Copy source',
      'COPY . .',
    ];

    if (profile.useTypescript) {
      lines.push('', '# Compile TypeScript', 'RUN npm run build');
    }

    lines.push(
      '',
      `# ---- Production Stage ----`,
      `FROM node:${nodeVersion}-alpine`,
      '',
      'WORKDIR /app',
      '',
      '# Non-root user for security',
      'RUN addgroup -S appgroup && adduser -S appuser -G appgroup',
      '',
      'COPY package*.json ./',
      'RUN npm ci --production',
      '',
    );

    if (profile.useTypescript) {
      lines.push('COPY --from=builder /app/dist ./dist');
    } else {
      lines.push('COPY --from=builder /app/src ./src');
    }

    lines.push(
      '',
      'USER appuser',
      '',
      `EXPOSE ${port}`,
      '',
      `HEALTHCHECK --interval=30s --timeout=5s --retries=3 \\`,
      `  CMD wget -qO- http://localhost:${port}/health || exit 1`,
      '',
      'CMD ["node", "src/index.js"]',
      '',
    );

    return { path: 'Dockerfile', content: lines.join('\n') };
  },

  // ---------------------------------------------------------------------------
  // docker-compose.yml
  // ---------------------------------------------------------------------------
  'docker-compose'(profile) {
    const name = ConfigGenerator.toKebab(profile.name || 'app');
    const port = profile.port || 3000;

    const compose = {
      version: '3.8',
      services: {
        [name]: {
          build: '.',
          ports: [`${port}:${port}`],
          env_file: ['.env'],
          restart: 'unless-stopped',
          volumes: ['./src:/app/src:ro'],
          healthcheck: {
            test: `wget -qO- http://localhost:${port}/health || exit 1`,
            interval: '30s',
            timeout: '5s',
            retries: 3,
          },
        },
      },
    };

    return {
      path: 'docker-compose.yml',
      content: toYaml(compose),
    };
  },

  // ---------------------------------------------------------------------------
  // GitHub Actions CI workflow
  // ---------------------------------------------------------------------------
  'github-actions'(profile) {
    const nodeVersion = profile.nodeVersion || '20';
    const name = profile.name || 'CI';

    const workflow = {
      name: `${name} CI`,
      on: {
        push: { branches: ['main'] },
        pull_request: { branches: ['main'] },
      },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          strategy: {
            matrix: {
              'node-version': [`${nodeVersion}.x`],
            },
          },
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              name: 'Use Node.js ${{ matrix.node-version }}',
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ matrix.node-version }}' },
            },
            { name: 'Install dependencies', run: 'npm ci' },
          ],
        },
      },
    };

    // Add lint step if ESLint is configured
    if (profile.useEslint) {
      workflow.jobs.test.steps.push({ name: 'Lint', run: 'npm run lint' });
    }

    // Test step
    workflow.jobs.test.steps.push({ name: 'Run tests', run: 'npm test' });

    // Build step for TypeScript
    if (profile.useTypescript) {
      workflow.jobs.test.steps.push({ name: 'Build', run: 'npm run build' });
    }

    return {
      path: '.github/workflows/ci.yml',
      content: toYaml(workflow),
    };
  },

  // ---------------------------------------------------------------------------
  // Generic JSON config
  // ---------------------------------------------------------------------------
  json(profile) {
    return {
      path: 'config.json',
      content: JSON.stringify(profile, null, 2) + '\n',
    };
  },

  // ---------------------------------------------------------------------------
  // Generic YAML config
  // ---------------------------------------------------------------------------
  yaml(profile) {
    return {
      path: 'config.yaml',
      content: toYaml(profile),
    };
  },

  // ---------------------------------------------------------------------------
  // Generic TOML config
  // ---------------------------------------------------------------------------
  toml(profile) {
    return {
      path: 'config.toml',
      content: toToml(profile),
    };
  },
};

// =============================================================================
// ConfigGenerator class
// =============================================================================

/**
 * ConfigGenerator produces configuration file contents. It does not perform I/O.
 */
export class ConfigGenerator {
  /** @type {ConfigProfile} */
  #profile;

  /**
   * @param {ConfigProfile} [profile={}]
   */
  constructor(profile = {}) {
    this.#profile = {
      name: 'app',
      version: '1.0.0',
      language: 'javascript',
      nodeVersion: '20',
      port: 3000,
      useDocker: false,
      useGitHubActions: true,
      useTypescript: false,
      usePrettier: true,
      useEslint: true,
      ...profile,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Generate a single configuration file by type.
   *
   * @param {ConfigType} type           - Config type identifier.
   * @param {ConfigProfile} [data={}]   - Override data merged with the base profile.
   * @returns {GeneratedConfig} Object with `path` and `content`.
   * @throws {Error} If the config type is not supported.
   */
  generateConfig(type, data = {}) {
    const generator = CONFIG_TEMPLATES[type];
    if (!generator) {
      const available = Object.keys(CONFIG_TEMPLATES).join(', ');
      throw new Error(`Unknown config type: "${type}". Available: ${available}`);
    }
    const merged = { ...this.#profile, ...data };
    return generator(merged);
  }

  /**
   * Generate all applicable configuration files for the current profile.
   *
   * Automatically selects which configs to generate based on the profile's
   * boolean flags (useDocker, useTypescript, useEslint, etc.).
   *
   * @param {ConfigProfile} [profileOverride] - Optional profile override.
   * @returns {GeneratedConfig[]} Array of generated config file descriptors.
   */
  generateAll(profileOverride) {
    const profile = profileOverride
      ? { ...this.#profile, ...profileOverride }
      : this.#profile;

    /** @type {GeneratedConfig[]} */
    const configs = [];

    // Always generated
    configs.push(CONFIG_TEMPLATES.gitignore(profile));
    configs.push(CONFIG_TEMPLATES.env(profile));
    configs.push(CONFIG_TEMPLATES['env-example'](profile));
    configs.push(CONFIG_TEMPLATES.editorconfig(profile));
    configs.push(CONFIG_TEMPLATES.vscode(profile));

    // Language-dependent
    if (profile.useTypescript || profile.language === 'typescript') {
      configs.push(CONFIG_TEMPLATES.tsconfig(profile));
    } else if (profile.language === 'javascript') {
      configs.push(CONFIG_TEMPLATES.jsconfig(profile));
    }

    // Tooling
    if (profile.useEslint) {
      configs.push(CONFIG_TEMPLATES.eslint(profile));
    }
    if (profile.usePrettier) {
      configs.push(CONFIG_TEMPLATES.prettier(profile));
    }

    // Docker
    if (profile.useDocker) {
      configs.push(CONFIG_TEMPLATES.dockerfile(profile));
      configs.push(CONFIG_TEMPLATES['docker-compose'](profile));
    }

    // CI/CD
    if (profile.useGitHubActions) {
      configs.push(CONFIG_TEMPLATES['github-actions'](profile));
    }

    return configs;
  }

  /**
   * List all available config template types with descriptions.
   *
   * @returns {{ type: string, description: string }[]}
   */
  getConfigTemplates() {
    /** @type {Record<string, string>} */
    const descriptions = {
      gitignore: 'Git ignore rules',
      env: 'Environment variables file',
      'env-example': 'Environment variables template',
      tsconfig: 'TypeScript compiler configuration',
      jsconfig: 'JavaScript project configuration',
      eslint: 'ESLint linter configuration',
      prettier: 'Prettier formatter configuration',
      editorconfig: 'Cross-editor formatting settings',
      vscode: 'VS Code workspace settings',
      dockerfile: 'Docker container image definition',
      'docker-compose': 'Docker Compose service orchestration',
      'github-actions': 'GitHub Actions CI/CD workflow',
      json: 'Generic JSON configuration',
      yaml: 'Generic YAML configuration',
      toml: 'Generic TOML configuration',
    };

    return Object.keys(CONFIG_TEMPLATES).map((type) => ({
      type,
      description: descriptions[type] || type,
    }));
  }

  /**
   * Generate a custom JSON config file at a given path.
   *
   * @param {string} filePath          - Relative output path.
   * @param {Object} data              - Data to serialize.
   * @returns {GeneratedConfig}
   */
  generateJsonConfig(filePath, data) {
    return {
      path: filePath,
      content: JSON.stringify(data, null, 2) + '\n',
    };
  }

  /**
   * Generate a custom YAML config file at a given path.
   *
   * @param {string} filePath
   * @param {Object} data
   * @returns {GeneratedConfig}
   */
  generateYamlConfig(filePath, data) {
    return {
      path: filePath,
      content: toYaml(data),
    };
  }

  /**
   * Generate a custom TOML config file at a given path.
   *
   * @param {string} filePath
   * @param {Object} data
   * @returns {GeneratedConfig}
   */
  generateTomlConfig(filePath, data) {
    return {
      path: filePath,
      content: toToml(data),
    };
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------

  /**
   * Convert a name to kebab-case.
   *
   * @param {string} name
   * @returns {string}
   */
  static toKebab(name) {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * Serialize an object to YAML. Exposed for external use.
   *
   * @param {Object} data
   * @returns {string}
   */
  static toYaml(data) {
    return toYaml(data);
  }

  /**
   * Serialize an object to TOML. Exposed for external use.
   *
   * @param {Object} data
   * @returns {string}
   */
  static toToml(data) {
    return toToml(data);
  }
}

export default ConfigGenerator;
