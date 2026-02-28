/**
 * @fileoverview CodeGenerator — Generates source code content for ClawOS.
 *
 * Produces actual source code strings for:
 *  - Module boilerplate (class, function, entry point)
 *  - Package manifests (package.json)
 *  - Test stubs
 *  - README files
 *  - Common architectural patterns (server, CLI, middleware, etc.)
 *
 * Supports multiple target languages through pluggable language adapters.
 * All methods return strings — no I/O is performed here.
 *
 * @module generator/code-generator
 * @author ClawOS Framework
 * @license MIT
 */

import path from 'node:path';

// =============================================================================
// Type definitions
// =============================================================================

/**
 * @typedef {'javascript'|'typescript'|'python'} SupportedLanguage
 */

/**
 * @typedef {Object} ModuleSpec
 * @property {string}  name            - Module name (PascalCase preferred).
 * @property {string}  [description]   - One-line description.
 * @property {string}  [archetype]     - Archetype hint (e.g. "event-driven").
 * @property {string[]} [imports]      - Modules this module depends on.
 * @property {string[]} [exports]      - Symbols exported by this module.
 * @property {MethodSpec[]} [methods]  - Methods / functions to generate.
 * @property {PropertySpec[]} [properties] - Properties / attributes.
 * @property {boolean} [isEntryPoint]  - Whether this is the main entry module.
 * @property {boolean} [hasTests]      - Generate a companion test file.
 */

/**
 * @typedef {Object} MethodSpec
 * @property {string}  name        - Method name.
 * @property {string}  [description]
 * @property {ParamSpec[]} [params]
 * @property {string}  [returnType] - Return type annotation.
 * @property {boolean} [isAsync]
 * @property {boolean} [isStatic]
 */

/**
 * @typedef {Object} ParamSpec
 * @property {string} name
 * @property {string} [type]
 * @property {string} [defaultValue]
 * @property {string} [description]
 */

/**
 * @typedef {Object} PropertySpec
 * @property {string}  name
 * @property {string}  [type]
 * @property {string}  [defaultValue]
 * @property {boolean} [isPrivate]
 * @property {string}  [description]
 */

/**
 * @typedef {Object} RequirementsProfile
 * @property {string}  name              - Framework / project name.
 * @property {string}  [description]
 * @property {string}  [version]
 * @property {string}  [author]
 * @property {string}  [license]
 * @property {string}  [domain]          - e.g. "api", "cli", "testing"
 * @property {string}  [archetype]       - e.g. "microservice", "monolith"
 * @property {SupportedLanguage} [language]
 * @property {string[]} [features]       - Requested capabilities.
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {ModuleSpec[]} [modules]
 */

// =============================================================================
// Language adapters
// =============================================================================

/**
 * @typedef {Object} LanguageAdapter
 * @property {string} extension          - File extension including dot.
 * @property {string} commentSingle      - Single-line comment prefix.
 * @property {string} commentBlockOpen   - Block comment opening.
 * @property {string} commentBlockClose  - Block comment closing.
 * @property {(from: string, symbols?: string[]) => string} importStatement
 * @property {(symbols: string[]) => string} exportStatement
 * @property {(name: string, spec: ModuleSpec) => string} classDefinition
 * @property {(spec: MethodSpec, indent?: string) => string} functionDefinition
 * @property {(spec: MethodSpec, indent?: string) => string} methodDefinition
 */

/** @type {Record<SupportedLanguage, LanguageAdapter>} */
const LANGUAGE_ADAPTERS = {
  // ---------------------------------------------------------------------------
  // JavaScript
  // ---------------------------------------------------------------------------
  javascript: {
    extension: '.js',
    commentSingle: '//',
    commentBlockOpen: '/**',
    commentBlockClose: ' */',
    importStatement(from, symbols) {
      if (!symbols || symbols.length === 0) {
        return `import '${from}';`;
      }
      if (symbols.length === 1 && symbols[0] === 'default') {
        const name = path.basename(from).replace(/\.\w+$/, '');
        const camel = name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        return `import ${camel} from '${from}';`;
      }
      return `import { ${symbols.join(', ')} } from '${from}';`;
    },
    exportStatement(symbols) {
      return `export { ${symbols.join(', ')} };`;
    },
    classDefinition(name, spec) {
      const lines = [];
      lines.push(`/**`);
      lines.push(` * ${spec.description || name}`);
      lines.push(` */`);
      lines.push(`export class ${name} {`);

      // Properties
      if (spec.properties?.length) {
        for (const prop of spec.properties) {
          const prefix = prop.isPrivate ? '#' : '';
          const val = prop.defaultValue ?? 'undefined';
          if (prop.description) {
            lines.push(`  /** @type {${prop.type || '*'}} ${prop.description} */`);
          }
          lines.push(`  ${prefix}${prop.name} = ${val};`);
        }
        lines.push('');
      }

      // Constructor
      lines.push(`  /**`);
      lines.push(`   * Create a new ${name} instance.`);
      lines.push(`   * @param {Object} [options={}]`);
      lines.push(`   */`);
      lines.push(`  constructor(options = {}) {`);
      if (spec.properties?.length) {
        for (const prop of spec.properties) {
          const prefix = prop.isPrivate ? '#' : '';
          lines.push(`    this.${prefix}${prop.name} = options.${prop.name} ?? this.${prefix}${prop.name};`);
        }
      }
      lines.push(`  }`);

      // Methods
      if (spec.methods?.length) {
        for (const method of spec.methods) {
          lines.push('');
          lines.push(LANGUAGE_ADAPTERS.javascript.methodDefinition(method, '  '));
        }
      }

      lines.push(`}`);
      return lines.join('\n');
    },
    functionDefinition(spec, indent = '') {
      const lines = [];
      const params = (spec.params || []).map((p) => {
        if (p.defaultValue !== undefined) return `${p.name} = ${p.defaultValue}`;
        return p.name;
      });
      const asyncKw = spec.isAsync ? 'async ' : '';

      // JSDoc
      lines.push(`${indent}/**`);
      if (spec.description) lines.push(`${indent} * ${spec.description}`);
      for (const p of spec.params || []) {
        lines.push(`${indent} * @param {${p.type || '*'}} ${p.name}${p.description ? ` - ${p.description}` : ''}`);
      }
      if (spec.returnType) {
        lines.push(`${indent} * @returns {${spec.returnType}}`);
      }
      lines.push(`${indent} */`);
      lines.push(`${indent}export ${asyncKw}function ${spec.name}(${params.join(', ')}) {`);
      lines.push(`${indent}  // TODO: implement`);
      lines.push(`${indent}}`);
      return lines.join('\n');
    },
    methodDefinition(spec, indent = '') {
      const lines = [];
      const params = (spec.params || []).map((p) => {
        if (p.defaultValue !== undefined) return `${p.name} = ${p.defaultValue}`;
        return p.name;
      });
      const asyncKw = spec.isAsync ? 'async ' : '';
      const staticKw = spec.isStatic ? 'static ' : '';

      lines.push(`${indent}/**`);
      if (spec.description) lines.push(`${indent} * ${spec.description}`);
      for (const p of spec.params || []) {
        lines.push(`${indent} * @param {${p.type || '*'}} ${p.name}${p.description ? ` - ${p.description}` : ''}`);
      }
      if (spec.returnType) lines.push(`${indent} * @returns {${spec.returnType}}`);
      lines.push(`${indent} */`);
      lines.push(`${indent}${staticKw}${asyncKw}${spec.name}(${params.join(', ')}) {`);
      lines.push(`${indent}  // TODO: implement`);
      lines.push(`${indent}}`);
      return lines.join('\n');
    },
  },

  // ---------------------------------------------------------------------------
  // TypeScript
  // ---------------------------------------------------------------------------
  typescript: {
    extension: '.ts',
    commentSingle: '//',
    commentBlockOpen: '/**',
    commentBlockClose: ' */',
    importStatement(from, symbols) {
      if (!symbols || symbols.length === 0) {
        return `import '${from}';`;
      }
      if (symbols.length === 1 && symbols[0] === 'default') {
        const name = path.basename(from).replace(/\.\w+$/, '');
        const camel = name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        return `import ${camel} from '${from}';`;
      }
      return `import { ${symbols.join(', ')} } from '${from}';`;
    },
    exportStatement(symbols) {
      return `export { ${symbols.join(', ')} };`;
    },
    classDefinition(name, spec) {
      const lines = [];
      lines.push(`/**`);
      lines.push(` * ${spec.description || name}`);
      lines.push(` */`);
      lines.push(`export class ${name} {`);

      if (spec.properties?.length) {
        for (const prop of spec.properties) {
          const vis = prop.isPrivate ? 'private ' : 'public ';
          const type = prop.type || 'unknown';
          if (prop.description) lines.push(`  /** ${prop.description} */`);
          if (prop.defaultValue !== undefined) {
            lines.push(`  ${vis}${prop.name}: ${type} = ${prop.defaultValue};`);
          } else {
            lines.push(`  ${vis}${prop.name}: ${type};`);
          }
        }
        lines.push('');
      }

      lines.push(`  constructor(options: Partial<${name}Options> = {}) {`);
      if (spec.properties?.length) {
        for (const prop of spec.properties) {
          lines.push(`    this.${prop.name} = options.${prop.name} ?? this.${prop.name};`);
        }
      }
      lines.push(`  }`);

      if (spec.methods?.length) {
        for (const method of spec.methods) {
          lines.push('');
          lines.push(LANGUAGE_ADAPTERS.typescript.methodDefinition(method, '  '));
        }
      }

      lines.push(`}`);

      // Options interface
      lines.push('');
      lines.push(`export interface ${name}Options {`);
      for (const prop of spec.properties || []) {
        lines.push(`  ${prop.name}?: ${prop.type || 'unknown'};`);
      }
      lines.push(`}`);

      return lines.join('\n');
    },
    functionDefinition(spec, indent = '') {
      const lines = [];
      const params = (spec.params || []).map((p) => {
        const type = p.type ? `: ${p.type}` : '';
        if (p.defaultValue !== undefined) return `${p.name}${type} = ${p.defaultValue}`;
        return `${p.name}${type}`;
      });
      const asyncKw = spec.isAsync ? 'async ' : '';
      const retType = spec.returnType ? `: ${spec.returnType}` : '';

      lines.push(`${indent}/**`);
      if (spec.description) lines.push(`${indent} * ${spec.description}`);
      for (const p of spec.params || []) {
        lines.push(`${indent} * @param ${p.name}${p.description ? ` - ${p.description}` : ''}`);
      }
      lines.push(`${indent} */`);
      lines.push(`${indent}export ${asyncKw}function ${spec.name}(${params.join(', ')})${retType} {`);
      lines.push(`${indent}  // TODO: implement`);
      lines.push(`${indent}}`);
      return lines.join('\n');
    },
    methodDefinition(spec, indent = '') {
      const lines = [];
      const params = (spec.params || []).map((p) => {
        const type = p.type ? `: ${p.type}` : '';
        if (p.defaultValue !== undefined) return `${p.name}${type} = ${p.defaultValue}`;
        return `${p.name}${type}`;
      });
      const asyncKw = spec.isAsync ? 'async ' : '';
      const staticKw = spec.isStatic ? 'static ' : '';
      const retType = spec.returnType ? `: ${spec.returnType}` : '';

      lines.push(`${indent}/**`);
      if (spec.description) lines.push(`${indent} * ${spec.description}`);
      for (const p of spec.params || []) {
        lines.push(`${indent} * @param ${p.name}${p.description ? ` - ${p.description}` : ''}`);
      }
      lines.push(`${indent} */`);
      lines.push(`${indent}${staticKw}${asyncKw}${spec.name}(${params.join(', ')})${retType} {`);
      lines.push(`${indent}  // TODO: implement`);
      lines.push(`${indent}}`);
      return lines.join('\n');
    },
  },

  // ---------------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------------
  python: {
    extension: '.py',
    commentSingle: '#',
    commentBlockOpen: '"""',
    commentBlockClose: '"""',
    importStatement(from, symbols) {
      if (!symbols || symbols.length === 0) {
        return `import ${from}`;
      }
      return `from ${from} import ${symbols.join(', ')}`;
    },
    exportStatement(symbols) {
      return `__all__ = [${symbols.map((s) => `'${s}'`).join(', ')}]`;
    },
    classDefinition(name, spec) {
      const lines = [];
      lines.push(`class ${name}:`);
      lines.push(`    """${spec.description || name}"""`);
      lines.push('');

      // __init__
      const initParams = ['self'];
      for (const prop of spec.properties || []) {
        if (prop.defaultValue !== undefined) {
          initParams.push(`${prop.name}=${prop.defaultValue}`);
        } else {
          initParams.push(`${prop.name}=None`);
        }
      }
      lines.push(`    def __init__(${initParams.join(', ')}):`);
      if (spec.properties?.length) {
        for (const prop of spec.properties) {
          const prefix = prop.isPrivate ? '_' : '';
          lines.push(`        self.${prefix}${prop.name} = ${prop.name}`);
        }
      } else {
        lines.push(`        pass`);
      }

      if (spec.methods?.length) {
        for (const method of spec.methods) {
          lines.push('');
          lines.push(LANGUAGE_ADAPTERS.python.methodDefinition(method, '    '));
        }
      }

      return lines.join('\n');
    },
    functionDefinition(spec, indent = '') {
      const lines = [];
      const asyncKw = spec.isAsync ? 'async ' : '';
      const params = (spec.params || []).map((p) => {
        if (p.defaultValue !== undefined) return `${p.name}=${p.defaultValue}`;
        return p.name;
      });

      lines.push(`${indent}${asyncKw}def ${spec.name}(${params.join(', ')}):`);
      lines.push(`${indent}    """${spec.description || spec.name}"""`);
      lines.push(`${indent}    pass  # TODO: implement`);
      return lines.join('\n');
    },
    methodDefinition(spec, indent = '') {
      const lines = [];
      const asyncKw = spec.isAsync ? 'async ' : '';
      const decorator = spec.isStatic ? `${indent}@staticmethod\n` : '';
      const selfParam = spec.isStatic ? [] : ['self'];
      const params = [
        ...selfParam,
        ...(spec.params || []).map((p) => {
          if (p.defaultValue !== undefined) return `${p.name}=${p.defaultValue}`;
          return p.name;
        }),
      ];

      if (decorator) lines.push(`${indent}@staticmethod`);
      lines.push(`${indent}${asyncKw}def ${spec.name}(${params.join(', ')}):`);
      lines.push(`${indent}    """${spec.description || spec.name}"""`);
      lines.push(`${indent}    pass  # TODO: implement`);
      return lines.join('\n');
    },
  },
};

// =============================================================================
// Code template library
// =============================================================================

/**
 * @typedef {Object} CodeTemplate
 * @property {string} name        - Template identifier.
 * @property {string} description - What this template generates.
 * @property {SupportedLanguage[]} languages - Supported target languages.
 * @property {(vars: Record<string, *>) => string} render
 */

/** @type {Record<string, CodeTemplate>} */
const CODE_TEMPLATES = {
  // ---------------------------------------------------------------------------
  // 1. Express-style server setup
  // ---------------------------------------------------------------------------
  'express-server': {
    name: 'express-server',
    description: 'HTTP server with routing, middleware, and graceful shutdown.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      const name = vars.name || 'server';
      const port = vars.port || 3000;
      return `/**
 * ${vars.description || 'HTTP Server'}
 * @module ${name}
 */

import http from 'node:http';

/** @type {Map<string, Map<string, Function>>} route → method → handler */
const routes = new Map();

/** @type {Function[]} */
const middlewareStack = [];

/**
 * Register a middleware function.
 * @param {Function} fn
 */
export function use(fn) {
  middlewareStack.push(fn);
}

/**
 * Register a route handler.
 * @param {string} method - HTTP method (GET, POST, etc.).
 * @param {string} path   - URL path.
 * @param {Function} handler - Request handler.
 */
export function route(method, path, handler) {
  if (!routes.has(path)) routes.set(path, new Map());
  routes.get(path).set(method.toUpperCase(), handler);
}

/** Convenience helpers. */
export const get = (p, h) => route('GET', p, h);
export const post = (p, h) => route('POST', p, h);
export const put = (p, h) => route('PUT', p, h);
export const del = (p, h) => route('DELETE', p, h);
export const patch = (p, h) => route('PATCH', p, h);

/**
 * Run the middleware stack, then dispatch to the matched route handler.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse}  res
 */
async function handleRequest(req, res) {
  const url = new URL(req.url || '/', \`http://\${req.headers.host}\`);
  req.pathname = url.pathname;
  req.query = Object.fromEntries(url.searchParams);

  // Middleware pipeline
  let idx = 0;
  const next = async () => {
    if (idx < middlewareStack.length) {
      await middlewareStack[idx++](req, res, next);
    }
  };

  try {
    await next();

    const methods = routes.get(url.pathname);
    if (!methods) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }
    const handler = methods.get(req.method);
    if (!handler) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }
    await handler(req, res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
  }
}

let server;

/**
 * Start the HTTP server.
 * @param {Object} [options]
 * @param {number} [options.port=${port}]
 * @returns {Promise<http.Server>}
 */
export function listen(options = {}) {
  const p = options.port ?? ${port};
  return new Promise((resolve) => {
    server = http.createServer(handleRequest);
    server.listen(p, () => {
      console.log(\`Server listening on port \${p}\`);
      resolve(server);
    });
  });
}

/**
 * Gracefully shut down the server.
 * @returns {Promise<void>}
 */
export function shutdown() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

// Graceful shutdown on signals
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.log(\`Received \${sig}, shutting down...\`);
    await shutdown();
    process.exit(0);
  });
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 2. CLI argument parser
  // ---------------------------------------------------------------------------
  'cli-parser': {
    name: 'cli-parser',
    description: 'Command-line argument parser with subcommands and help generation.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      const name = vars.name || 'cli';
      return `/**
 * ${vars.description || 'CLI Argument Parser'}
 * @module ${name}
 */

/**
 * @typedef {Object} CommandDef
 * @property {string}   name        - Command name.
 * @property {string}   description - One-line description.
 * @property {OptionDef[]} [options]
 * @property {Function} action      - Handler function.
 */

/**
 * @typedef {Object} OptionDef
 * @property {string}  name         - Long name (e.g. "output").
 * @property {string}  [alias]      - Short alias (e.g. "o").
 * @property {string}  description
 * @property {boolean} [required]
 * @property {string}  [defaultValue]
 * @property {string}  [type]       - "string" | "boolean" | "number"
 */

/** @type {Map<string, CommandDef>} */
const commands = new Map();

/** @type {OptionDef[]} */
const globalOptions = [];

let programName = '${name}';
let programVersion = '${vars.version || '1.0.0'}';
let programDescription = '${vars.description || ''}';

/**
 * Set program metadata.
 * @param {Object} meta
 */
export function program(meta) {
  if (meta.name) programName = meta.name;
  if (meta.version) programVersion = meta.version;
  if (meta.description) programDescription = meta.description;
}

/**
 * Register a global option.
 * @param {OptionDef} option
 */
export function option(option) {
  globalOptions.push(option);
}

/**
 * Register a command.
 * @param {CommandDef} cmd
 */
export function command(cmd) {
  commands.set(cmd.name, cmd);
}

/**
 * Parse argv and run the matching command.
 * @param {string[]} [argv=process.argv.slice(2)]
 */
export async function run(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    printHelp();
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(programVersion);
    return;
  }

  const cmdName = argv[0];
  const cmd = commands.get(cmdName);

  if (!cmd) {
    console.error(\`Unknown command: \${cmdName}. Use --help for usage.\`);
    process.exitCode = 1;
    return;
  }

  const parsed = parseOptions(argv.slice(1), [
    ...globalOptions,
    ...(cmd.options || []),
  ]);

  // Validate required options
  for (const opt of [...globalOptions, ...(cmd.options || [])]) {
    if (opt.required && parsed[opt.name] === undefined) {
      console.error(\`Missing required option: --\${opt.name}\`);
      process.exitCode = 1;
      return;
    }
  }

  await cmd.action(parsed);
}

/**
 * Parse an argv-style array into an options object.
 * @param {string[]} argv
 * @param {OptionDef[]} defs
 * @returns {Record<string, *>}
 */
function parseOptions(argv, defs) {
  const result = {};
  const aliasMap = {};

  for (const def of defs) {
    if (def.defaultValue !== undefined) result[def.name] = def.defaultValue;
    if (def.alias) aliasMap[def.alias] = def.name;
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const def = defs.find((d) => d.name === key);
      if (def?.type === 'boolean') {
        result[key] = true;
      } else {
        result[key] = argv[++i];
      }
    } else if (arg.startsWith('-')) {
      const alias = arg.slice(1);
      const name = aliasMap[alias] || alias;
      const def = defs.find((d) => d.name === name);
      if (def?.type === 'boolean') {
        result[name] = true;
      } else {
        result[name] = argv[++i];
      }
    }
  }

  return result;
}

/**
 * Print usage help to stdout.
 */
function printHelp() {
  console.log(\`\${programName} v\${programVersion}\`);
  if (programDescription) console.log(programDescription);
  console.log('');
  console.log('Usage:');
  console.log(\`  \${programName} <command> [options]\`);
  console.log('');
  console.log('Commands:');
  for (const [name, cmd] of commands) {
    console.log(\`  \${name.padEnd(20)} \${cmd.description}\`);
  }
  if (globalOptions.length) {
    console.log('');
    console.log('Global Options:');
    for (const opt of globalOptions) {
      const alias = opt.alias ? \`-\${opt.alias}, \` : '    ';
      console.log(\`  \${alias}--\${opt.name.padEnd(16)} \${opt.description}\`);
    }
  }
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Test runner setup
  // ---------------------------------------------------------------------------
  'test-runner': {
    name: 'test-runner',
    description: 'Lightweight test runner with describe/it/expect pattern.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Lightweight Test Runner'}
 * @module test-runner
 */

/** @type {{ name: string, fn: Function, status: string, error?: Error }[]} */
const tests = [];
let currentSuite = '';

/**
 * Define a test suite.
 * @param {string} name
 * @param {Function} fn
 */
export function describe(name, fn) {
  const prev = currentSuite;
  currentSuite = prev ? \`\${prev} > \${name}\` : name;
  fn();
  currentSuite = prev;
}

/**
 * Define a test case.
 * @param {string} name
 * @param {Function} fn
 */
export function it(name, fn) {
  const fullName = currentSuite ? \`\${currentSuite} > \${name}\` : name;
  tests.push({ name: fullName, fn, status: 'pending' });
}

/** Alias for it(). */
export const test = it;

/**
 * Create an assertion wrapper for a value.
 * @param {*} actual
 * @returns {Object}
 */
export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(\`Expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(\`Expected deep equal \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(\`Expected truthy, got \${JSON.stringify(actual)}\`);
    },
    toBeFalsy() {
      if (actual) throw new Error(\`Expected falsy, got \${JSON.stringify(actual)}\`);
    },
    toContain(item) {
      if (typeof actual === 'string') {
        if (!actual.includes(item)) throw new Error(\`Expected string to contain "\${item}"\`);
      } else if (Array.isArray(actual)) {
        if (!actual.includes(item)) throw new Error(\`Expected array to contain \${JSON.stringify(item)}\`);
      }
    },
    toThrow(expected) {
      let threw = false;
      try { actual(); } catch (e) {
        threw = true;
        if (expected && !e.message.includes(expected)) {
          throw new Error(\`Expected error "\${expected}", got "\${e.message}"\`);
        }
      }
      if (!threw) throw new Error('Expected function to throw');
    },
    toBeInstanceOf(cls) {
      if (!(actual instanceof cls)) {
        throw new Error(\`Expected instance of \${cls.name}\`);
      }
    },
    toHaveLength(len) {
      if (actual.length !== len) {
        throw new Error(\`Expected length \${len}, got \${actual.length}\`);
      }
    },
  };
}

/**
 * Run all registered tests and print results.
 * @returns {Promise<{ passed: number, failed: number, total: number }>}
 */
export async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      t.status = 'passed';
      passed++;
      console.log(\`  \\x1b[32m\\u2713\\x1b[0m \${t.name}\`);
    } catch (err) {
      t.status = 'failed';
      t.error = err;
      failed++;
      console.log(\`  \\x1b[31m\\u2717\\x1b[0m \${t.name}\`);
      console.log(\`    \\x1b[31m\${err.message}\\x1b[0m\`);
    }
  }

  console.log(\`\\n\${passed} passed, \${failed} failed, \${tests.length} total\`);
  if (failed > 0) process.exitCode = 1;

  return { passed, failed, total: tests.length };
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 4. Plugin loader
  // ---------------------------------------------------------------------------
  'plugin-loader': {
    name: 'plugin-loader',
    description: 'Dynamic plugin discovery, loading, and lifecycle management.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Plugin Loader'}
 * @module plugin-loader
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * @typedef {Object} Plugin
 * @property {string}   name       - Unique plugin identifier.
 * @property {string}   [version]
 * @property {Function} [activate] - Called when the plugin is loaded.
 * @property {Function} [deactivate] - Called when the plugin is unloaded.
 * @property {Object}   [api]      - Public API the plugin exposes.
 */

/** @type {Map<string, Plugin>} */
const registry = new Map();

/** @type {Map<string, boolean>} */
const activePlugins = new Map();

/**
 * Discover plugins in a directory.
 * Each subdirectory or .js file is treated as a potential plugin.
 *
 * @param {string} pluginDir - Absolute path to plugin directory.
 * @returns {Promise<string[]>} List of discovered plugin paths.
 */
export async function discover(pluginDir) {
  const entries = await fs.readdir(pluginDir, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(pluginDir, entry.name, 'index.js');
      try {
        await fs.access(indexPath);
        plugins.push(indexPath);
      } catch { /* no index.js — skip */ }
    } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      plugins.push(path.join(pluginDir, entry.name));
    }
  }

  return plugins;
}

/**
 * Load a single plugin from its file path.
 *
 * @param {string} pluginPath - Absolute path to the plugin module.
 * @returns {Promise<Plugin>}
 */
export async function load(pluginPath) {
  const mod = await import(pluginPath);
  const plugin = mod.default || mod;

  if (!plugin.name) {
    plugin.name = path.basename(pluginPath, '.js');
  }

  registry.set(plugin.name, plugin);
  return plugin;
}

/**
 * Activate a loaded plugin.
 *
 * @param {string} name    - Plugin name.
 * @param {Object} context - Host context passed to the plugin.
 * @returns {Promise<void>}
 */
export async function activate(name, context = {}) {
  const plugin = registry.get(name);
  if (!plugin) throw new Error(\`Plugin "\${name}" is not loaded.\`);
  if (activePlugins.get(name)) return; // already active

  if (typeof plugin.activate === 'function') {
    await plugin.activate(context);
  }
  activePlugins.set(name, true);
}

/**
 * Deactivate a plugin.
 *
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function deactivate(name) {
  const plugin = registry.get(name);
  if (!plugin || !activePlugins.get(name)) return;

  if (typeof plugin.deactivate === 'function') {
    await plugin.deactivate();
  }
  activePlugins.set(name, false);
}

/**
 * Load and activate all plugins found in a directory.
 *
 * @param {string} pluginDir
 * @param {Object} context
 * @returns {Promise<Plugin[]>}
 */
export async function loadAll(pluginDir, context = {}) {
  const paths = await discover(pluginDir);
  const loaded = [];

  for (const p of paths) {
    const plugin = await load(p);
    await activate(plugin.name, context);
    loaded.push(plugin);
  }

  return loaded;
}

/**
 * Get a loaded plugin by name.
 * @param {string} name
 * @returns {Plugin|undefined}
 */
export function get(name) {
  return registry.get(name);
}

/**
 * List all loaded plugins.
 * @returns {Plugin[]}
 */
export function list() {
  return [...registry.values()];
}

/**
 * Unload all plugins.
 * @returns {Promise<void>}
 */
export async function unloadAll() {
  for (const name of [...activePlugins.keys()]) {
    await deactivate(name);
  }
  registry.clear();
  activePlugins.clear();
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Event bus
  // ---------------------------------------------------------------------------
  'event-bus': {
    name: 'event-bus',
    description: 'Publish/subscribe event bus with namespacing and wildcard support.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Event Bus'}
 * @module event-bus
 */

/**
 * @typedef {Object} EventBus
 * @property {Function} on       - Subscribe to an event.
 * @property {Function} off      - Unsubscribe.
 * @property {Function} once     - Subscribe for a single emission.
 * @property {Function} emit     - Emit an event.
 * @property {Function} clear    - Remove all listeners.
 */

/**
 * Create a new EventBus instance.
 * Supports:
 *  - Exact event names: "user.created"
 *  - Wildcard listeners: "user.*" or "*"
 *  - Once-only listeners
 *
 * @returns {EventBus}
 */
export function createEventBus() {
  /** @type {Map<string, Set<{ fn: Function, once: boolean }>>} */
  const listeners = new Map();

  /** @type {{ event: string, data: *, timestamp: number }[]} */
  const history = [];

  /**
   * Subscribe to an event.
   * @param {string}   event
   * @param {Function} fn
   * @returns {Function} Unsubscribe function.
   */
  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    const entry = { fn, once: false };
    listeners.get(event).add(entry);
    return () => listeners.get(event)?.delete(entry);
  }

  /**
   * Subscribe for a single emission.
   * @param {string}   event
   * @param {Function} fn
   * @returns {Function} Unsubscribe function.
   */
  function once(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    const entry = { fn, once: true };
    listeners.get(event).add(entry);
    return () => listeners.get(event)?.delete(entry);
  }

  /**
   * Unsubscribe a specific function from an event.
   * @param {string}   event
   * @param {Function} fn
   */
  function off(event, fn) {
    const set = listeners.get(event);
    if (!set) return;
    for (const entry of set) {
      if (entry.fn === fn) { set.delete(entry); break; }
    }
  }

  /**
   * Emit an event, invoking all matching listeners.
   * @param {string} event
   * @param {*}      data
   * @returns {Promise<void>}
   */
  async function emit(event, data) {
    history.push({ event, data, timestamp: Date.now() });

    const matching = getMatchingListeners(event);
    for (const { entry, key } of matching) {
      await entry.fn(data, { event, timestamp: Date.now() });
      if (entry.once) listeners.get(key)?.delete(entry);
    }
  }

  /**
   * Get listeners matching an event, including wildcards.
   * @param {string} event
   * @returns {{ entry: { fn: Function, once: boolean }, key: string }[]}
   */
  function getMatchingListeners(event) {
    const result = [];

    for (const [key, set] of listeners) {
      if (key === event || key === '*') {
        for (const entry of set) result.push({ entry, key });
      } else if (key.endsWith('.*')) {
        const prefix = key.slice(0, -2);
        if (event.startsWith(prefix + '.') || event === prefix) {
          for (const entry of set) result.push({ entry, key });
        }
      }
    }

    return result;
  }

  /**
   * Remove all listeners.
   */
  function clear() {
    listeners.clear();
  }

  /**
   * Get event history.
   * @returns {ReadonlyArray<{ event: string, data: *, timestamp: number }>}
   */
  function getHistory() {
    return Object.freeze([...history]);
  }

  return { on, off, once, emit, clear, getHistory };
}

/** Singleton default bus. */
export const bus = createEventBus();
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 6. Config reader
  // ---------------------------------------------------------------------------
  'config-reader': {
    name: 'config-reader',
    description: 'Layered configuration reader with env-var expansion and defaults.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Configuration Reader'}
 * @module config-reader
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Deep-merge two objects. Source values override target values.
 * Arrays are replaced, not concatenated.
 *
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Expand environment variables in string values.
 * Supports \${VAR} and \${VAR:-default} syntax.
 *
 * @param {*} value
 * @returns {*}
 */
function expandEnvVars(value) {
  if (typeof value === 'string') {
    return value.replace(/\\$\\{([^}]+)\\}/g, (_match, expr) => {
      const [varName, fallback] = expr.split(':-');
      return process.env[varName] ?? fallback ?? '';
    });
  }
  if (Array.isArray(value)) return value.map(expandEnvVars);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) result[k] = expandEnvVars(v);
    return result;
  }
  return value;
}

/**
 * Load a JSON configuration file.
 * Returns empty object if file does not exist.
 *
 * @param {string} filePath
 * @returns {Promise<Object>}
 */
async function loadJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

/**
 * Create a config reader with layered sources.
 *
 * @param {Object} options
 * @param {Object}   [options.defaults={}]   - Default values (lowest priority).
 * @param {string[]} [options.files=[]]      - Config file paths (merged in order).
 * @param {boolean}  [options.expandEnv=true] - Expand \${VAR} in string values.
 * @returns {Promise<Object>} Frozen config object.
 */
export async function loadConfig(options = {}) {
  let config = options.defaults ?? {};

  for (const file of options.files ?? []) {
    const ext = path.extname(file);
    let layer = {};

    if (ext === '.json') {
      layer = await loadJsonFile(file);
    }
    // Additional formats can be added here.

    config = deepMerge(config, layer);
  }

  if (options.expandEnv !== false) {
    config = expandEnvVars(config);
  }

  return Object.freeze(config);
}

/**
 * Get a nested value from a config object using dot notation.
 *
 * @param {Object} config - Config object.
 * @param {string} key    - Dot-notated key (e.g. "server.port").
 * @param {*}      [fallback] - Fallback if key is missing.
 * @returns {*}
 */
export function get(config, key, fallback) {
  const parts = key.split('.');
  let current = config;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[part];
  }
  return current ?? fallback;
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 7. Middleware pipeline
  // ---------------------------------------------------------------------------
  'middleware-pipeline': {
    name: 'middleware-pipeline',
    description: 'Composable middleware pipeline with async support.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Middleware Pipeline'}
 * @module middleware-pipeline
 */

/**
 * @callback Middleware
 * @param {Object} context - Mutable context passed through the pipeline.
 * @param {Function} next  - Call to invoke the next middleware.
 * @returns {Promise<void>|void}
 */

/**
 * Create a composable middleware pipeline.
 *
 * @returns {Object} Pipeline with use() and execute() methods.
 */
export function createPipeline() {
  /** @type {Middleware[]} */
  const stack = [];

  /**
   * Add a middleware to the pipeline.
   * @param {Middleware} fn
   * @returns {Object} The pipeline (for chaining).
   */
  function use(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be a function');
    }
    stack.push(fn);
    return pipeline;
  }

  /**
   * Execute the pipeline with the given context.
   *
   * @param {Object} context - Initial context.
   * @returns {Promise<Object>} The (possibly mutated) context.
   */
  async function execute(context = {}) {
    let index = -1;

    async function dispatch(i) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      if (i >= stack.length) return;

      const fn = stack[i];
      await fn(context, () => dispatch(i + 1));
    }

    await dispatch(0);
    return context;
  }

  /**
   * Get the current number of middleware functions.
   * @returns {number}
   */
  function size() {
    return stack.length;
  }

  const pipeline = { use, execute, size };
  return pipeline;
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 8. State machine
  // ---------------------------------------------------------------------------
  'state-machine': {
    name: 'state-machine',
    description: 'Finite state machine with guarded transitions and lifecycle hooks.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Finite State Machine'}
 * @module state-machine
 */

/**
 * @typedef {Object} Transition
 * @property {string}   from   - Source state.
 * @property {string}   to     - Target state.
 * @property {string}   event  - Trigger event name.
 * @property {Function} [guard] - Returns true to allow transition.
 * @property {Function} [action] - Side-effect executed during transition.
 */

/**
 * @typedef {Object} StateMachineConfig
 * @property {string}       initial      - Initial state.
 * @property {Transition[]} transitions  - Allowed transitions.
 * @property {Record<string, Function>} [onEnter] - state -> hook
 * @property {Record<string, Function>} [onExit]  - state -> hook
 */

/**
 * Create a finite state machine.
 *
 * @param {StateMachineConfig} config
 * @returns {Object} Machine API.
 */
export function createStateMachine(config) {
  let currentState = config.initial;
  const history = [currentState];

  /** @type {Function[]} */
  const changeListeners = [];

  /**
   * Get the current state.
   * @returns {string}
   */
  function getState() {
    return currentState;
  }

  /**
   * Attempt to trigger a transition.
   *
   * @param {string} event  - Event name.
   * @param {Object} [payload] - Optional data passed to guards/actions.
   * @returns {Promise<boolean>} Whether the transition occurred.
   */
  async function send(event, payload = {}) {
    const transition = config.transitions.find(
      (t) => t.from === currentState && t.event === event,
    );

    if (!transition) return false;

    // Check guard
    if (transition.guard && !(await transition.guard(payload))) {
      return false;
    }

    const prev = currentState;

    // onExit hook
    if (config.onExit?.[prev]) {
      await config.onExit[prev]({ from: prev, to: transition.to, event, payload });
    }

    // Transition action
    if (transition.action) {
      await transition.action(payload);
    }

    currentState = transition.to;
    history.push(currentState);

    // onEnter hook
    if (config.onEnter?.[currentState]) {
      await config.onEnter[currentState]({ from: prev, to: currentState, event, payload });
    }

    // Notify listeners
    for (const fn of changeListeners) {
      await fn({ from: prev, to: currentState, event, payload });
    }

    return true;
  }

  /**
   * Check whether an event can be triggered from the current state.
   * @param {string} event
   * @returns {boolean}
   */
  function can(event) {
    return config.transitions.some(
      (t) => t.from === currentState && t.event === event,
    );
  }

  /**
   * Get all events available from the current state.
   * @returns {string[]}
   */
  function availableEvents() {
    return config.transitions
      .filter((t) => t.from === currentState)
      .map((t) => t.event);
  }

  /**
   * Subscribe to state changes.
   * @param {Function} fn
   * @returns {Function} Unsubscribe.
   */
  function onChange(fn) {
    changeListeners.push(fn);
    return () => {
      const idx = changeListeners.indexOf(fn);
      if (idx >= 0) changeListeners.splice(idx, 1);
    };
  }

  /**
   * Get full state history.
   * @returns {string[]}
   */
  function getHistory() {
    return [...history];
  }

  return { getState, send, can, availableEvents, onChange, getHistory };
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 9. Error handler
  // ---------------------------------------------------------------------------
  'error-handler': {
    name: 'error-handler',
    description: 'Centralized error handling with classification and recovery.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Error Handler'}
 * @module error-handler
 */

/**
 * Base application error with code, status, and metadata.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {string} [options.code='UNKNOWN_ERROR']
   * @param {number} [options.statusCode=500]
   * @param {boolean} [options.isOperational=true]
   * @param {Object} [options.metadata={}]
   * @param {Error}  [options.cause]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    this.metadata = options.metadata ?? {};
    this.timestamp = new Date().toISOString();
    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** Common error factory functions. */
export const Errors = {
  notFound: (resource, id) =>
    new AppError(\`\${resource} not found: \${id}\`, { code: 'NOT_FOUND', statusCode: 404 }),
  validation: (message, metadata) =>
    new AppError(message, { code: 'VALIDATION_ERROR', statusCode: 400, metadata }),
  unauthorized: (message = 'Unauthorized') =>
    new AppError(message, { code: 'UNAUTHORIZED', statusCode: 401 }),
  forbidden: (message = 'Forbidden') =>
    new AppError(message, { code: 'FORBIDDEN', statusCode: 403 }),
  conflict: (message) =>
    new AppError(message, { code: 'CONFLICT', statusCode: 409 }),
  internal: (message, cause) =>
    new AppError(message, { code: 'INTERNAL_ERROR', statusCode: 500, isOperational: false, cause }),
};

/**
 * Create a centralized error handler.
 *
 * @param {Object} [options]
 * @param {Function} [options.logger]      - Custom logger (default: console.error).
 * @param {Function} [options.onFatal]     - Called for non-operational errors.
 * @param {boolean}  [options.exitOnFatal] - Exit process on fatal error (default: true).
 * @returns {Object}
 */
export function createErrorHandler(options = {}) {
  const logger = options.logger ?? console.error;
  const exitOnFatal = options.exitOnFatal ?? true;

  /** @type {{ error: AppError, timestamp: string }[]} */
  const errorLog = [];

  /**
   * Handle an error.
   * @param {Error|AppError} error
   */
  function handle(error) {
    const appError = error instanceof AppError
      ? error
      : new AppError(error.message, { code: 'UNEXPECTED', isOperational: false, cause: error });

    errorLog.push({ error: appError, timestamp: new Date().toISOString() });

    logger(\`[\${appError.code}] \${appError.message}\`, {
      statusCode: appError.statusCode,
      metadata: appError.metadata,
      stack: appError.stack,
    });

    if (!appError.isOperational) {
      if (options.onFatal) options.onFatal(appError);
      if (exitOnFatal) process.exit(1);
    }
  }

  /**
   * Wrap an async function with error handling.
   * @param {Function} fn
   * @returns {Function}
   */
  function wrap(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        handle(err);
      }
    };
  }

  /**
   * Express-compatible error middleware.
   */
  function middleware(err, _req, res, _next) {
    handle(err);
    const appErr = err instanceof AppError ? err : new AppError(err.message);
    res.writeHead(appErr.statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: { code: appErr.code, message: appErr.message },
    }));
  }

  /**
   * Install global unhandled-rejection and uncaught-exception handlers.
   */
  function installGlobalHandlers() {
    process.on('unhandledRejection', (reason) => {
      handle(reason instanceof Error ? reason : new Error(String(reason)));
    });
    process.on('uncaughtException', (error) => {
      handle(error);
    });
  }

  /**
   * Get recorded errors.
   * @returns {ReadonlyArray<{ error: AppError, timestamp: string }>}
   */
  function getErrors() {
    return Object.freeze([...errorLog]);
  }

  return { handle, wrap, middleware, installGlobalHandlers, getErrors };
}
`;
    },
  },

  // ---------------------------------------------------------------------------
  // 10. Logger
  // ---------------------------------------------------------------------------
  logger: {
    name: 'logger',
    description: 'Structured logger with levels, transports, and child loggers.',
    languages: ['javascript', 'typescript'],
    render(vars) {
      return `/**
 * ${vars.description || 'Structured Logger'}
 * @module logger
 */

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

/**
 * Create a logger instance.
 *
 * @param {Object} [options]
 * @param {string} [options.level='info']         - Minimum level to emit.
 * @param {string} [options.name='app']           - Logger name.
 * @param {boolean} [options.json=false]          - Output as JSON.
 * @param {boolean} [options.timestamp=true]      - Include timestamps.
 * @param {Function} [options.transport=console]  - Custom transport.
 * @returns {Object}
 */
export function createLogger(options = {}) {
  const minLevel = LEVELS[options.level ?? 'info'] ?? LEVELS.info;
  const name = options.name ?? 'app';
  const json = options.json ?? false;
  const showTimestamp = options.timestamp !== false;
  const transport = options.transport ?? null;
  const context = options.context ?? {};

  function shouldLog(level) {
    return (LEVELS[level] ?? 0) >= minLevel;
  }

  function formatMessage(level, message, data) {
    const entry = {
      ...(showTimestamp && { timestamp: new Date().toISOString() }),
      level,
      name,
      ...context,
      message,
      ...(data && Object.keys(data).length > 0 && { data }),
    };

    if (json) return JSON.stringify(entry);

    const ts = showTimestamp ? \`\${entry.timestamp} \` : '';
    const prefix = \`\${ts}[\${level.toUpperCase().padEnd(5)}] [\${name}]\`;
    const extra = data ? \` \${JSON.stringify(data)}\` : '';
    return \`\${prefix} \${message}\${extra}\`;
  }

  function log(level, message, data) {
    if (!shouldLog(level)) return;
    const formatted = formatMessage(level, message, data);

    if (transport) {
      transport(formatted, { level, name, message, data });
      return;
    }

    if (LEVELS[level] >= LEVELS.error) {
      console.error(formatted);
    } else if (LEVELS[level] >= LEVELS.warn) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Create a child logger with additional context.
   * @param {Object} childContext
   * @returns {Object}
   */
  function child(childContext) {
    return createLogger({
      ...options,
      context: { ...context, ...childContext },
    });
  }

  return {
    trace: (msg, data) => log('trace', msg, data),
    debug: (msg, data) => log('debug', msg, data),
    info:  (msg, data) => log('info', msg, data),
    warn:  (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    fatal: (msg, data) => log('fatal', msg, data),
    child,
  };
}

/** Default logger instance. */
export const logger = createLogger();
`;
    },
  },
};

// =============================================================================
// CodeGenerator class
// =============================================================================

/**
 * CodeGenerator produces source code strings for modules, entry points,
 * package manifests, tests, and README files. It does not perform I/O.
 */
export class CodeGenerator {
  /** @type {SupportedLanguage} */
  #defaultLanguage;

  /**
   * @param {Object} [options={}]
   * @param {SupportedLanguage} [options.language='javascript']
   */
  constructor(options = {}) {
    this.#defaultLanguage = options.language ?? 'javascript';
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Generate a complete module file (class or functions) from a ModuleSpec.
   *
   * @param {ModuleSpec} moduleSpec
   * @param {SupportedLanguage} [language]
   * @returns {string} Generated source code.
   */
  generateModule(moduleSpec, language) {
    const lang = language ?? this.#defaultLanguage;
    const adapter = CodeGenerator.#getAdapter(lang);
    const lines = [];

    // File header
    lines.push(this.#fileHeader(moduleSpec.name, moduleSpec.description, adapter));
    lines.push('');

    // Imports
    if (moduleSpec.imports?.length) {
      for (const imp of moduleSpec.imports) {
        lines.push(adapter.importStatement(imp));
      }
      lines.push('');
    }

    // Class definition
    lines.push(adapter.classDefinition(moduleSpec.name, moduleSpec));
    lines.push('');

    // Default export
    lines.push(`export default ${moduleSpec.name};`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate the main entry point file that imports and wires up all modules.
   *
   * @param {ModuleSpec[]} modules - All modules in the framework.
   * @param {Object} [config={}]  - Extra configuration for the entry point.
   * @param {string} [config.name]
   * @param {string} [config.description]
   * @param {string} [config.domain]
   * @returns {string}
   */
  generateEntryPoint(modules, config = {}) {
    const adapter = CodeGenerator.#getAdapter(this.#defaultLanguage);
    const lines = [];
    const name = config.name || 'framework';

    lines.push(this.#fileHeader('index', config.description || `${name} entry point`, adapter));
    lines.push('');

    // Import all modules
    for (const mod of modules) {
      const relPath = `./core/${CodeGenerator.#toKebab(mod.name)}${adapter.extension}`;
      lines.push(adapter.importStatement(relPath, [mod.name]));
    }
    lines.push('');

    // Re-export
    if (modules.length) {
      lines.push(adapter.exportStatement(modules.map((m) => m.name)));
      lines.push('');
    }

    // Bootstrap function
    lines.push(`/**`);
    lines.push(` * Bootstrap the ${name} framework.`);
    lines.push(` *`);
    lines.push(` * @param {Object} [options={}]`);
    lines.push(` * @returns {Promise<Object>} Initialized framework API.`);
    lines.push(` */`);
    lines.push(`export async function bootstrap(options = {}) {`);
    lines.push(`  const context = { options, modules: {} };`);
    lines.push('');
    for (const mod of modules) {
      const varName = CodeGenerator.#toCamel(mod.name);
      lines.push(`  context.modules.${varName} = new ${mod.name}(options);`);
    }
    lines.push('');
    lines.push(`  return context;`);
    lines.push(`}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a package.json object (returned as a formatted JSON string).
   *
   * @param {RequirementsProfile} profile
   * @returns {string} JSON string.
   */
  generatePackageJson(profile) {
    const pkg = {
      name: CodeGenerator.#toKebab(profile.name),
      version: profile.version || '1.0.0',
      description: profile.description || '',
      author: profile.author || '',
      license: profile.license || 'MIT',
      type: 'module',
      main: 'src/index.js',
      exports: {
        '.': './src/index.js',
      },
      engines: {
        node: '>=18.0.0',
      },
      scripts: {
        start: 'node src/index.js',
        test: 'node --test tests/',
        lint: 'echo "No linter configured"',
      },
      keywords: profile.features || [],
      dependencies: profile.dependencies || {},
      devDependencies: profile.devDependencies || {},
    };

    // Domain-specific scripts
    if (profile.domain === 'api') {
      pkg.scripts.dev = 'node --watch src/index.js';
    } else if (profile.domain === 'cli') {
      pkg.bin = { [CodeGenerator.#toKebab(profile.name)]: './src/index.js' };
    }

    return JSON.stringify(pkg, null, 2) + '\n';
  }

  /**
   * Generate test file stubs for the given modules.
   *
   * @param {ModuleSpec[]} modules
   * @returns {{ path: string, content: string }[]} Array of test files.
   */
  generateTests(modules) {
    const adapter = CodeGenerator.#getAdapter(this.#defaultLanguage);
    const testFiles = [];

    for (const mod of modules) {
      const kebab = CodeGenerator.#toKebab(mod.name);
      const lines = [];

      lines.push(`import { describe, it } from 'node:test';`);
      lines.push(`import assert from 'node:assert/strict';`);
      lines.push(adapter.importStatement(`../src/core/${kebab}${adapter.extension}`, [mod.name]));
      lines.push('');
      lines.push(`describe('${mod.name}', () => {`);

      // Constructor test
      lines.push(`  it('should create an instance', () => {`);
      lines.push(`    const instance = new ${mod.name}();`);
      lines.push(`    assert.ok(instance);`);
      lines.push(`  });`);

      // Method tests
      if (mod.methods?.length) {
        for (const method of mod.methods) {
          lines.push('');
          lines.push(`  it('should have method ${method.name}', () => {`);
          lines.push(`    const instance = new ${mod.name}();`);
          lines.push(`    assert.equal(typeof instance.${method.name}, 'function');`);
          lines.push(`  });`);
        }
      }

      lines.push(`});`);
      lines.push('');

      testFiles.push({
        path: `tests/${kebab}.test${adapter.extension}`,
        content: lines.join('\n'),
      });
    }

    return testFiles;
  }

  /**
   * Generate a README.md from a RequirementsProfile.
   *
   * @param {RequirementsProfile} profile
   * @returns {string} Markdown content.
   */
  generateReadme(profile) {
    const name = profile.name || 'Framework';
    const lines = [];

    lines.push(`# ${name}`);
    lines.push('');
    if (profile.description) {
      lines.push(`> ${profile.description}`);
      lines.push('');
    }

    lines.push(`## Quick Start`);
    lines.push('');
    lines.push('```bash');
    lines.push(`npm install`);
    if (profile.domain === 'cli') {
      lines.push(`npm link`);
      lines.push(`${CodeGenerator.#toKebab(name)} --help`);
    } else {
      lines.push(`npm start`);
    }
    lines.push('```');
    lines.push('');

    if (profile.features?.length) {
      lines.push(`## Features`);
      lines.push('');
      for (const feature of profile.features) {
        lines.push(`- ${feature}`);
      }
      lines.push('');
    }

    lines.push(`## Project Structure`);
    lines.push('');
    lines.push('```');
    lines.push(`${CodeGenerator.#toKebab(name)}/`);
    lines.push(`├── src/`);
    lines.push(`│   ├── core/       # Core modules`);
    lines.push(`│   ├── utils/      # Utilities`);
    lines.push(`│   └── index.js    # Entry point`);
    lines.push(`├── tests/          # Test suite`);
    lines.push(`├── docs/           # Documentation`);
    lines.push(`└── package.json`);
    lines.push('```');
    lines.push('');

    if (profile.modules?.length) {
      lines.push(`## Modules`);
      lines.push('');
      lines.push(`| Module | Description |`);
      lines.push(`|--------|-------------|`);
      for (const mod of profile.modules) {
        lines.push(`| ${mod.name} | ${mod.description || '-'} |`);
      }
      lines.push('');
    }

    lines.push(`## Development`);
    lines.push('');
    lines.push('```bash');
    lines.push(`npm test        # Run tests`);
    lines.push(`npm run lint    # Lint code`);
    lines.push('```');
    lines.push('');

    lines.push(`## License`);
    lines.push('');
    lines.push(`${profile.license || 'MIT'}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get a code template by name. Returns the rendered string.
   *
   * @param {string} templateName - Template identifier (e.g. "express-server").
   * @param {Record<string, *>} [vars={}] - Variables for the template.
   * @returns {string} Rendered template source code.
   * @throws {Error} If template is not found.
   */
  getTemplate(templateName, vars = {}) {
    const template = CODE_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown code template: "${templateName}". Available: ${Object.keys(CODE_TEMPLATES).join(', ')}`);
    }
    return template.render(vars);
  }

  /**
   * List all available code template names.
   *
   * @returns {{ name: string, description: string, languages: SupportedLanguage[] }[]}
   */
  listTemplates() {
    return Object.values(CODE_TEMPLATES).map((t) => ({
      name: t.name,
      description: t.description,
      languages: t.languages,
    }));
  }

  /**
   * Get the language adapter for the current default language.
   *
   * @returns {LanguageAdapter}
   */
  getAdapter() {
    return CodeGenerator.#getAdapter(this.#defaultLanguage);
  }

  /**
   * Get a language adapter by language key.
   *
   * @returns {LanguageAdapter}
   */
  getAdapterFor(language) {
    return CodeGenerator.#getAdapter(language);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Produce a file-level JSDoc / docstring header.
   *
   * @param {string} moduleName
   * @param {string} [description]
   * @param {LanguageAdapter} adapter
   * @returns {string}
   */
  #fileHeader(moduleName, description, adapter) {
    if (adapter === LANGUAGE_ADAPTERS.python) {
      return `"""\n${description || moduleName}\n\nModule: ${moduleName}\n"""`;
    }
    const lines = [];
    lines.push(adapter.commentBlockOpen);
    lines.push(` * @fileoverview ${description || moduleName}`);
    lines.push(` * @module ${moduleName}`);
    lines.push(adapter.commentBlockClose);
    return lines.join('\n');
  }

  /**
   * Get a language adapter, throwing if unsupported.
   *
   * @param {SupportedLanguage} lang
   * @returns {LanguageAdapter}
   */
  static #getAdapter(lang) {
    const adapter = LANGUAGE_ADAPTERS[lang];
    if (!adapter) {
      throw new Error(`Unsupported language: "${lang}". Supported: ${Object.keys(LANGUAGE_ADAPTERS).join(', ')}`);
    }
    return adapter;
  }

  /**
   * Convert a PascalCase or camelCase name to kebab-case.
   * @param {string} name
   * @returns {string}
   */
  static #toKebab(name) {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * Convert a name to camelCase.
   * @param {string} name
   * @returns {string}
   */
  static #toCamel(name) {
    const kebab = CodeGenerator.#toKebab(name);
    return kebab.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  }

  // ---------------------------------------------------------------------------
  // Agent & Workflow generation (team-replacement frameworks)
  // ---------------------------------------------------------------------------

  /**
   * Generate an agent definition file.
   *
   * @param {Object} agentSpec
   * @param {string} agentSpec.id        - Agent identifier (kebab-case).
   * @param {string} agentSpec.name      - Human-readable agent name.
   * @param {string} agentSpec.role      - Agent's role description.
   * @param {string[]} agentSpec.capabilities - What the agent can do.
   * @param {string} [agentSpec.persona] - Optional persona description.
   * @param {SupportedLanguage} [language='javascript']
   * @returns {string} Complete agent definition source code.
   */
  generateAgent(agentSpec, language = 'javascript') {
    const adapter = CodeGenerator.#getAdapter(language);
    const className = agentSpec.name.replace(/[^a-zA-Z0-9]/g, '') + 'Agent';
    const caps = agentSpec.capabilities.map(c => `'${c}'`).join(', ');

    if (language === 'python') {
      return `"""
Agent: ${agentSpec.name}
Role: ${agentSpec.role}
${agentSpec.persona ? `Persona: ${agentSpec.persona}` : ''}
"""

class ${className}:
    """${agentSpec.role}"""

    def __init__(self, config=None):
        self.id = '${agentSpec.id}'
        self.name = '${agentSpec.name}'
        self.role = '${agentSpec.role}'
        self.capabilities = [${caps}]
        self.config = config or {}
        self.history = []

    async def execute(self, task, context=None):
        """Execute a task within this agent's capabilities."""
        if task.get('type') not in self.capabilities:
            raise ValueError(f"Task type '{task.get('type')}' not in capabilities: {self.capabilities}")

        self.history.append({'task': task, 'status': 'started'})

        try:
            result = await self._process(task, context or {})
            self.history[-1]['status'] = 'completed'
            self.history[-1]['result'] = result
            return result
        except Exception as e:
            self.history[-1]['status'] = 'failed'
            self.history[-1]['error'] = str(e)
            raise

    async def _process(self, task, context):
        """Process the task. Override in subclasses for custom logic."""
        return {'agent': self.id, 'task': task.get('type'), 'status': 'processed'}

    def get_system_prompt(self):
        """Return the system prompt for this agent when used with an LLM."""
        return f"""You are {self.name}, a {self.role}.
Your capabilities: {', '.join(self.capabilities)}.
${agentSpec.persona ? `Personality: ${agentSpec.persona}` : ''}
Always stay within your defined role and capabilities."""

    def get_status(self):
        """Return current agent status."""
        return {
            'id': self.id,
            'name': self.name,
            'tasks_completed': len([h for h in self.history if h['status'] == 'completed']),
            'tasks_failed': len([h for h in self.history if h['status'] == 'failed']),
        }
`;
    }

    // JavaScript / TypeScript
    const tsTypes = language === 'typescript' ? `
/** @typedef {{ type: string, data?: any, priority?: 'low'|'medium'|'high' }} AgentTask */
/** @typedef {{ [key: string]: any }} AgentContext */
/** @typedef {{ agent: string, task: string, status: string, output?: any }} AgentResult */
` : '';

    return `${this.#fileHeader(agentSpec.id, `Agent: ${agentSpec.name} — ${agentSpec.role}`, adapter)}
${tsTypes}
import { EventEmitter } from 'node:events';

/**
 * ${agentSpec.name} — ${agentSpec.role}
 * ${agentSpec.persona || ''}
 *
 * Capabilities: ${agentSpec.capabilities.join(', ')}
 */
export class ${className} extends EventEmitter {
  /** @type {string} */
  id = '${agentSpec.id}';

  /** @type {string} */
  name = '${agentSpec.name}';

  /** @type {string} */
  role = '${agentSpec.role}';

  /** @type {string[]} */
  capabilities = [${caps}];

  /** @type {Array<{task: object, status: string, result?: any, error?: string}>} */
  #history = [];

  /** @type {object} */
  #config;

  constructor(config = {}) {
    super();
    this.#config = config;
  }

  /**
   * Execute a task within this agent's capabilities.
   * @param {{ type: string, data?: any }} task
   * @param {object} [context={}]
   * @returns {Promise<{ agent: string, task: string, status: string, output?: any }>}
   */
  async execute(task, context = {}) {
    if (!this.capabilities.includes(task.type)) {
      throw new Error(\`[\${this.name}] Task type "\${task.type}" not in capabilities: \${this.capabilities.join(', ')}\`);
    }

    const entry = { task, status: 'started', startedAt: Date.now() };
    this.#history.push(entry);
    this.emit('task:start', { agent: this.id, task });

    try {
      const result = await this.#process(task, context);
      entry.status = 'completed';
      entry.result = result;
      entry.duration = Date.now() - entry.startedAt;
      this.emit('task:complete', { agent: this.id, task, result, duration: entry.duration });
      return { agent: this.id, task: task.type, status: 'completed', output: result };
    } catch (error) {
      entry.status = 'failed';
      entry.error = error.message;
      entry.duration = Date.now() - entry.startedAt;
      this.emit('task:error', { agent: this.id, task, error: error.message });
      throw error;
    }
  }

  /**
   * Internal task processing. Override in subclasses for custom logic.
   * @param {{ type: string, data?: any }} task
   * @param {object} context
   * @returns {Promise<any>}
   */
  async #process(task, context) {
    return { agent: this.id, task: task.type, status: 'processed', context: Object.keys(context) };
  }

  /**
   * Get the system prompt for this agent (for LLM-based execution).
   * @returns {string}
   */
  getSystemPrompt() {
    return \`You are \${this.name}, a \${this.role}.
Your capabilities: \${this.capabilities.join(', ')}.
${agentSpec.persona ? `Personality: ${agentSpec.persona}` : ''}
Always stay within your defined role and capabilities.
When given a task, analyze it carefully, execute it thoroughly, and report results clearly.\`;
  }

  /**
   * Get agent status and history summary.
   * @returns {{ id: string, name: string, completed: number, failed: number, history: object[] }}
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      completed: this.#history.filter(h => h.status === 'completed').length,
      failed: this.#history.filter(h => h.status === 'failed').length,
      totalTasks: this.#history.length,
      history: this.#history.slice(-10),
    };
  }
}

export default ${className};
`;
  }

  /**
   * Generate a workflow definition file.
   *
   * @param {Object} workflowSpec
   * @param {string} workflowSpec.id     - Workflow identifier (kebab-case).
   * @param {string} workflowSpec.name   - Human-readable name.
   * @param {string[]} workflowSpec.phases - Ordered phase names.
   * @param {SupportedLanguage} [language='javascript']
   * @returns {string} Complete workflow definition source code.
   */
  generateWorkflow(workflowSpec, language = 'javascript') {
    const adapter = CodeGenerator.#getAdapter(language);
    const className = workflowSpec.name.replace(/[^a-zA-Z0-9]/g, '') + 'Workflow';
    const phasesStr = workflowSpec.phases.map(p => `'${p}'`).join(', ');

    return `${this.#fileHeader(workflowSpec.id, `Workflow: ${workflowSpec.name}`, adapter)}

import { EventEmitter } from 'node:events';

/**
 * ${workflowSpec.name} Workflow
 *
 * Phases: ${workflowSpec.phases.join(' → ')}
 */
export class ${className} extends EventEmitter {
  /** @type {string} */
  id = '${workflowSpec.id}';

  /** @type {string} */
  name = '${workflowSpec.name}';

  /** @type {string[]} */
  phases = [${phasesStr}];

  /** @type {'idle'|'running'|'paused'|'completed'|'failed'} */
  #status = 'idle';

  /** @type {number} */
  #currentPhaseIndex = -1;

  /** @type {Map<string, any>} */
  #phaseResults = new Map();

  /** @type {object} */
  #config;

  constructor(config = {}) {
    super();
    this.#config = config;
  }

  /**
   * Execute the full workflow sequentially through all phases.
   * @param {object} [context={}] - Initial context passed to the first phase.
   * @returns {Promise<{ workflow: string, status: string, phases: object[], duration: number }>}
   */
  async execute(context = {}) {
    if (this.#status === 'running') {
      throw new Error(\`[\${this.name}] Workflow is already running\`);
    }

    this.#status = 'running';
    this.#currentPhaseIndex = -1;
    this.#phaseResults.clear();
    const startTime = Date.now();

    this.emit('workflow:start', { workflow: this.id, phases: this.phases });

    let currentContext = { ...context };

    for (let i = 0; i < this.phases.length; i++) {
      if (this.#status === 'paused') {
        await this.#waitForResume();
      }
      if (this.#status === 'failed') break;

      this.#currentPhaseIndex = i;
      const phase = this.phases[i];

      this.emit('phase:start', { workflow: this.id, phase, index: i });

      try {
        const result = await this.#executePhase(phase, currentContext);
        this.#phaseResults.set(phase, result);
        currentContext = { ...currentContext, [\`\${phase}Result\`]: result };

        this.emit('phase:complete', { workflow: this.id, phase, index: i, result });
      } catch (error) {
        this.#status = 'failed';
        this.emit('phase:error', { workflow: this.id, phase, index: i, error: error.message });
        this.emit('workflow:error', { workflow: this.id, phase, error: error.message });

        return {
          workflow: this.id,
          status: 'failed',
          failedPhase: phase,
          phases: this.#getPhasesSummary(),
          duration: Date.now() - startTime,
        };
      }
    }

    this.#status = 'completed';
    const duration = Date.now() - startTime;

    this.emit('workflow:complete', { workflow: this.id, duration, phases: this.#getPhasesSummary() });

    return {
      workflow: this.id,
      status: 'completed',
      phases: this.#getPhasesSummary(),
      duration,
    };
  }

  /**
   * Pause the workflow after the current phase completes.
   */
  pause() {
    if (this.#status === 'running') this.#status = 'paused';
  }

  /**
   * Resume a paused workflow.
   */
  resume() {
    if (this.#status === 'paused') {
      this.#status = 'running';
      this.emit('workflow:resume', { workflow: this.id });
    }
  }

  /**
   * Get current workflow status.
   * @returns {{ id: string, name: string, status: string, currentPhase: string|null, progress: number }}
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.#status,
      currentPhase: this.#currentPhaseIndex >= 0 ? this.phases[this.#currentPhaseIndex] : null,
      progress: this.phases.length > 0
        ? Math.round((this.#phaseResults.size / this.phases.length) * 100)
        : 0,
      phaseResults: Object.fromEntries(this.#phaseResults),
    };
  }

  /** @private */
  async #executePhase(phase, context) {
    // Default implementation — override or use agent dispatch in real usage
    return { phase, status: 'completed', timestamp: new Date().toISOString() };
  }

  /** @private */
  #getPhasesSummary() {
    return this.phases.map(p => ({
      phase: p,
      status: this.#phaseResults.has(p) ? 'completed' : 'pending',
      result: this.#phaseResults.get(p) || null,
    }));
  }

  /** @private */
  async #waitForResume() {
    return new Promise(resolve => {
      const check = () => {
        if (this.#status !== 'paused') resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }
}

export default ${className};
`;
  }

  /**
   * Generate an orchestrator file that coordinates agents through workflows.
   *
   * @param {Object[]} agents - Agent specs.
   * @param {Object[]} workflows - Workflow specs.
   * @param {SupportedLanguage} [language='javascript']
   * @returns {string}
   */
  generateOrchestrator(agents, workflows, language = 'javascript') {
    const agentImports = agents.map(a => {
      const className = a.name.replace(/[^a-zA-Z0-9]/g, '') + 'Agent';
      return `import { ${className} } from './agents/${a.id}.js';`;
    }).join('\n');

    const agentInits = agents.map(a => {
      const className = a.name.replace(/[^a-zA-Z0-9]/g, '') + 'Agent';
      return `    this.agents.set('${a.id}', new ${className}(config));`;
    }).join('\n');

    const workflowImports = workflows.map(w => {
      const className = w.name.replace(/[^a-zA-Z0-9]/g, '') + 'Workflow';
      return `import { ${className} } from './workflows/${w.id}.js';`;
    }).join('\n');

    const workflowInits = workflows.map(w => {
      const className = w.name.replace(/[^a-zA-Z0-9]/g, '') + 'Workflow';
      return `    this.workflows.set('${w.id}', new ${className}(config));`;
    }).join('\n');

    return `/**
 * @fileoverview Orchestrator — Coordinates agents and workflows.
 * This is the central control plane for the framework.
 */

import { EventEmitter } from 'node:events';
${agentImports}
${workflowImports}

export class Orchestrator extends EventEmitter {
  /** @type {Map<string, object>} */
  agents = new Map();

  /** @type {Map<string, object>} */
  workflows = new Map();

  /** @type {Array<object>} */
  #executionLog = [];

  constructor(config = {}) {
    super();
${agentInits}
${workflowInits}

    // Wire agent events to orchestrator
    for (const [id, agent] of this.agents) {
      agent.on('task:start', (data) => this.emit('agent:task:start', data));
      agent.on('task:complete', (data) => this.emit('agent:task:complete', data));
      agent.on('task:error', (data) => this.emit('agent:task:error', data));
    }
  }

  /**
   * Dispatch a task to a specific agent.
   * @param {string} agentId
   * @param {{ type: string, data?: any }} task
   * @param {object} [context={}]
   * @returns {Promise<any>}
   */
  async dispatchToAgent(agentId, task, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(\`Agent not found: \${agentId}\`);

    const entry = { type: 'agent-dispatch', agentId, task, timestamp: Date.now() };
    this.#executionLog.push(entry);

    const result = await agent.execute(task, context);
    entry.result = result;
    entry.duration = Date.now() - entry.timestamp;
    return result;
  }

  /**
   * Execute a specific workflow.
   * @param {string} workflowId
   * @param {object} [context={}]
   * @returns {Promise<any>}
   */
  async runWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(\`Workflow not found: \${workflowId}\`);

    const entry = { type: 'workflow-run', workflowId, timestamp: Date.now() };
    this.#executionLog.push(entry);

    const result = await workflow.execute(context);
    entry.result = result;
    entry.duration = Date.now() - entry.timestamp;
    return result;
  }

  /**
   * Run the full orchestration pipeline — all workflows in sequence.
   * @param {object} [context={}]
   * @returns {Promise<{ status: string, workflows: object[], totalDuration: number }>}
   */
  async runAll(context = {}) {
    const startTime = Date.now();
    this.emit('orchestration:start', { workflows: [...this.workflows.keys()] });

    const results = [];
    let currentContext = { ...context };

    for (const [id, workflow] of this.workflows) {
      const result = await this.runWorkflow(id, currentContext);
      results.push(result);
      currentContext = { ...currentContext, [\`\${id}Result\`]: result };
    }

    const totalDuration = Date.now() - startTime;
    this.emit('orchestration:complete', { totalDuration, workflows: results });

    return { status: 'completed', workflows: results, totalDuration };
  }

  /**
   * Get overall orchestration status.
   * @returns {object}
   */
  getStatus() {
    return {
      agents: [...this.agents.entries()].map(([id, a]) => ({ id, ...a.getStatus() })),
      workflows: [...this.workflows.entries()].map(([id, w]) => ({ id, ...w.getStatus() })),
      executionLog: this.#executionLog.slice(-20),
    };
  }
}

export default Orchestrator;
`;
  }
}

export default CodeGenerator;
