/**
 * @module config-schema
 * @description Configuration schema definitions for the ClawOS framework.
 * Defines the full config schema with types, defaults, descriptions, and
 * validation rules. Used by {@link ConfigResolver} to validate resolved
 * configuration objects and to derive sensible defaults.
 *
 * Every schema field follows the shape:
 *   { type, default, description, required?, enum?, validate? }
 *
 * The module exports:
 *   - CONFIG_SCHEMA  - The complete schema tree
 *   - validateConfig - Validates a config object against the schema
 *   - getDefaults    - Derives a defaults object from the schema
 */

// ---------------------------------------------------------------------------
// Schema field type constants
// ---------------------------------------------------------------------------

/**
 * Supported field types in the schema.
 * @readonly
 * @enum {string}
 */
export const FieldType = Object.freeze({
  STRING:  'string',
  NUMBER:  'number',
  BOOLEAN: 'boolean',
  OBJECT:  'object',
  ARRAY:   'array',
});

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SchemaField
 * @property {string}       type        - One of {@link FieldType}.
 * @property {*}            default     - Default value for the field.
 * @property {string}       description - Human-readable description.
 * @property {boolean}      [required]  - Whether the field is required.
 * @property {Array<*>}     [enum]      - Allowed values (for constrained choices).
 * @property {Function}     [validate]  - Custom validation function (value) => true | string.
 * @property {Record<string, SchemaField>} [properties] - Child schema for nested objects.
 */

/**
 * The complete ClawOS configuration schema.
 * @type {Record<string, SchemaField>}
 */
export const CONFIG_SCHEMA = Object.freeze({
  // ---------------------------------------------------------------------------
  // output.*
  // ---------------------------------------------------------------------------
  output: {
    type: FieldType.OBJECT,
    description: 'Controls where and how generated frameworks are written.',
    required: false,
    default: undefined, // derived from children
    properties: {
      baseDir: {
        type: FieldType.STRING,
        default: './generated',
        description: 'Root directory for generated framework output.',
        required: false,
        validate: (v) =>
          typeof v === 'string' && v.length > 0
            ? true
            : 'baseDir must be a non-empty string',
      },
      overwrite: {
        type: FieldType.BOOLEAN,
        default: false,
        description: 'Whether to overwrite existing files in the output directory.',
        required: false,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // generation.*
  // ---------------------------------------------------------------------------
  generation: {
    type: FieldType.OBJECT,
    description: 'Code generation preferences.',
    required: false,
    default: undefined,
    properties: {
      language: {
        type: FieldType.STRING,
        default: 'javascript',
        description: 'Primary programming language for generated code.',
        required: false,
        enum: ['javascript', 'typescript'],
      },
      style: {
        type: FieldType.STRING,
        default: 'es-modules',
        description: 'Module style for generated code.',
        required: false,
        enum: ['es-modules', 'commonjs'],
      },
      includeTests: {
        type: FieldType.BOOLEAN,
        default: true,
        description: 'Generate test files alongside source modules.',
        required: false,
      },
      includeDocs: {
        type: FieldType.BOOLEAN,
        default: true,
        description: 'Generate documentation files (README, API docs).',
        required: false,
      },
      includeCi: {
        type: FieldType.BOOLEAN,
        default: true,
        description: 'Generate CI/CD configuration files (GitHub Actions, etc.).',
        required: false,
      },
      includeDocker: {
        type: FieldType.BOOLEAN,
        default: false,
        description: 'Generate Dockerfile and docker-compose configuration.',
        required: false,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // claudeCode.*
  // ---------------------------------------------------------------------------
  claudeCode: {
    type: FieldType.OBJECT,
    description: 'Claude Code integration settings.',
    required: false,
    default: undefined,
    properties: {
      generateClaudeMd: {
        type: FieldType.BOOLEAN,
        default: true,
        description: 'Generate a CLAUDE.md file with project instructions.',
        required: false,
      },
      generateCommands: {
        type: FieldType.BOOLEAN,
        default: true,
        description: 'Generate slash command definitions for Claude Code.',
        required: false,
      },
      generateMcp: {
        type: FieldType.BOOLEAN,
        default: false,
        description: 'Generate MCP (Model Context Protocol) server configuration.',
        required: false,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // templates.*
  // ---------------------------------------------------------------------------
  templates: {
    type: FieldType.OBJECT,
    description: 'Template engine settings.',
    required: false,
    default: undefined,
    properties: {
      engine: {
        type: FieldType.STRING,
        default: 'built-in',
        description: 'Template engine to use for file generation.',
        required: false,
        enum: ['built-in', 'handlebars', 'ejs'],
      },
    },
  },

  // ---------------------------------------------------------------------------
  // validation.*
  // ---------------------------------------------------------------------------
  validation: {
    type: FieldType.OBJECT,
    description: 'Post-generation validation settings.',
    required: false,
    default: undefined,
    properties: {
      strict: {
        type: FieldType.BOOLEAN,
        default: false,
        description: 'Enable strict mode: treat warnings as errors.',
        required: false,
      },
      autoFix: {
        type: FieldType.BOOLEAN,
        default: true,
        description: 'Attempt to auto-fix common issues after generation.',
        required: false,
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively extracts default values from a schema tree.
 *
 * @param {Record<string, SchemaField>} schema - The schema (or sub-schema) to traverse.
 * @returns {Record<string, *>} An object containing all default values.
 */
function extractDefaults(schema) {
  const defaults = {};

  for (const [key, field] of Object.entries(schema)) {
    if (field.type === FieldType.OBJECT && field.properties) {
      defaults[key] = extractDefaults(field.properties);
    } else if (field.default !== undefined) {
      defaults[key] = field.default;
    }
  }

  return defaults;
}

/**
 * Returns the full defaults object derived from {@link CONFIG_SCHEMA}.
 *
 * @returns {Record<string, *>}
 */
export function getDefaults() {
  return extractDefaults(CONFIG_SCHEMA);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ValidationError
 * @property {string} path     - Dot-separated path to the offending field.
 * @property {string} message  - Human-readable error description.
 * @property {string} type     - Error category: 'type' | 'enum' | 'required' | 'custom'.
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}           valid  - True if the config passes all checks.
 * @property {ValidationError[]} errors - List of errors found (empty when valid).
 */

/**
 * Checks the JavaScript type of a value against a {@link FieldType}.
 *
 * @param {*}      value
 * @param {string} expectedType - One of the {@link FieldType} values.
 * @returns {boolean}
 */
function matchesType(value, expectedType) {
  switch (expectedType) {
    case FieldType.STRING:
      return typeof value === 'string';
    case FieldType.NUMBER:
      return typeof value === 'number' && !Number.isNaN(value);
    case FieldType.BOOLEAN:
      return typeof value === 'boolean';
    case FieldType.OBJECT:
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case FieldType.ARRAY:
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Recursively validates a config object against a schema tree.
 *
 * @param {Record<string, *>}           config - The config (or sub-tree) to validate.
 * @param {Record<string, SchemaField>} schema - The schema (or sub-tree) to validate against.
 * @param {string}                      prefix - Dot-path prefix for error reporting.
 * @param {ValidationError[]}           errors - Accumulator for errors.
 */
function validateTree(config, schema, prefix, errors) {
  // Check for required fields that are missing from config.
  for (const [key, field] of Object.entries(schema)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = config?.[key];

    // Required check.
    if (field.required && (value === undefined || value === null)) {
      errors.push({ path, message: `Required field "${path}" is missing.`, type: 'required' });
      continue;
    }

    // Skip validation for absent optional fields.
    if (value === undefined || value === null) {
      continue;
    }

    // Type check.
    if (!matchesType(value, field.type)) {
      errors.push({
        path,
        message: `Expected type "${field.type}" for "${path}", got "${typeof value}".`,
        type: 'type',
      });
      continue; // Skip deeper checks if type is wrong.
    }

    // Enum check.
    if (field.enum && !field.enum.includes(value)) {
      errors.push({
        path,
        message: `Value "${value}" for "${path}" is not one of: [${field.enum.join(', ')}].`,
        type: 'enum',
      });
    }

    // Custom validator.
    if (typeof field.validate === 'function') {
      const result = field.validate(value);
      if (result !== true) {
        errors.push({
          path,
          message: typeof result === 'string' ? result : `Custom validation failed for "${path}".`,
          type: 'custom',
        });
      }
    }

    // Recurse into nested objects.
    if (field.type === FieldType.OBJECT && field.properties) {
      validateTree(value, field.properties, path, errors);
    }
  }

  // Warn about unknown keys in config that are not in the schema.
  if (config && typeof config === 'object') {
    for (const key of Object.keys(config)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!schema[key]) {
        errors.push({
          path,
          message: `Unknown configuration key "${path}".`,
          type: 'unknown',
        });
      }
    }
  }
}

/**
 * Validates a configuration object against {@link CONFIG_SCHEMA}.
 *
 * @param {Record<string, *>} config - The configuration object to validate.
 * @returns {ValidationResult}
 */
export function validateConfig(config) {
  /** @type {ValidationError[]} */
  const errors = [];
  validateTree(config, CONFIG_SCHEMA, '', errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default CONFIG_SCHEMA;
