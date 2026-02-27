/**
 * @module TemplateEngine
 * @description A zero-dependency template processing engine for ClawOS Framework.
 * Supports variable substitution, conditionals, loops, partials, filters, nested
 * variables, and escape handling. Designed to generate real source files for
 * frameworks built by ClawOS.
 *
 * @author ClawOS Framework
 * @license MIT
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Built-in filter helpers
// ---------------------------------------------------------------------------

/**
 * Convert a string to camelCase.
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, ch) => (ch ? ch.toUpperCase() : ''))
    .replace(/^[A-Z]/, (ch) => ch.toLowerCase());
}

/**
 * Convert a string to PascalCase.
 * @param {string} str
 * @returns {string}
 */
function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert a string to kebab-case.
 * @param {string} str
 * @returns {string}
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert a string to snake_case.
 * @param {string} str
 * @returns {string}
 */
function toSnakeCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .toLowerCase();
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Naive pluralization (covers common English cases).
 * @param {string} str
 * @returns {string}
 */
function plural(str) {
  if (!str) return '';
  if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || str.endsWith('ch') || str.endsWith('sh')) {
    return str + 'es';
  }
  return str + 's';
}

/**
 * Naive singularization (covers common English cases).
 * @param {string} str
 * @returns {string}
 */
function singular(str) {
  if (!str) return '';
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes') || str.endsWith('ches') || str.endsWith('shes')) {
    return str.slice(0, -2);
  }
  if (str.endsWith('s') && !str.endsWith('ss')) {
    return str.slice(0, -1);
  }
  return str;
}

// ---------------------------------------------------------------------------
// Escape placeholders — used to protect literal {{ / }} inside templates
// ---------------------------------------------------------------------------

const ESCAPE_OPEN = '\x00CLAWOS_ESC_OPEN\x00';
const ESCAPE_CLOSE = '\x00CLAWOS_ESC_CLOSE\x00';

// ---------------------------------------------------------------------------
// TemplateEngine
// ---------------------------------------------------------------------------

/**
 * @class TemplateEngine
 * @description Zero-dependency template engine for ClawOS.
 *
 * Syntax reference:
 *   Variable:      {{variableName}}
 *   Nested:        {{object.nested.key}}
 *   Filter:        {{variable | filterName}}
 *   Chained:       {{variable | filterA | filterB}}
 *   Conditional:   {{#if condition}}...{{/if}}
 *                  {{#if condition}}...{{else}}...{{/if}}
 *   Unless:        {{#unless condition}}...{{/unless}}
 *   Loop:          {{#each items}}...{{/each}}
 *                  Inside loops: {{.}} for primitive, {{@index}}, {{@key}}, {{@first}}, {{@last}}
 *   Partial:       {{> partialName}}
 *   Escape:        \\{{ and \\}} produce literal {{ and }}
 */
class TemplateEngine {
  /** @type {Map<string, string>} */
  #partials = new Map();

  /** @type {Map<string, function>} */
  #filters = new Map();

  constructor() {
    // Register built-in filters
    this.registerFilter('uppercase', (v) => String(v).toUpperCase());
    this.registerFilter('lowercase', (v) => String(v).toLowerCase());
    this.registerFilter('camelCase', (v) => toCamelCase(String(v)));
    this.registerFilter('kebabCase', (v) => toKebabCase(String(v)));
    this.registerFilter('pascalCase', (v) => toPascalCase(String(v)));
    this.registerFilter('snakeCase', (v) => toSnakeCase(String(v)));
    this.registerFilter('capitalize', (v) => capitalize(String(v)));
    this.registerFilter('plural', (v) => plural(String(v)));
    this.registerFilter('singular', (v) => singular(String(v)));
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Render a template string with the given data context.
   * @param {string} template  — the template source
   * @param {Record<string, *>} [data={}] — data context
   * @returns {string} rendered output
   */
  render(template, data = {}) {
    if (typeof template !== 'string') {
      throw new TypeError('TemplateEngine.render() expects a string template');
    }

    // 1. Protect escaped braces
    let src = template
      .replace(/\\{{/g, ESCAPE_OPEN)
      .replace(/\\}}/g, ESCAPE_CLOSE);

    // 2. Process block helpers (if, unless, each) — these are recursive
    src = this.#processBlocks(src, data);

    // 3. Process partials
    src = this.#processPartials(src, data);

    // 4. Process variable interpolation (with optional filters)
    src = this.#processVariables(src, data);

    // 5. Restore escaped braces
    src = src
      .replaceAll(ESCAPE_OPEN, '{{')
      .replaceAll(ESCAPE_CLOSE, '}}');

    return src;
  }

  /**
   * Register a named partial template.
   * @param {string} name
   * @param {string} template
   */
  registerPartial(name, template) {
    if (typeof name !== 'string' || !name) {
      throw new TypeError('Partial name must be a non-empty string');
    }
    if (typeof template !== 'string') {
      throw new TypeError('Partial template must be a string');
    }
    this.#partials.set(name, template);
  }

  /**
   * Register a custom filter / transform function.
   * @param {string} name
   * @param {(value: string) => string} fn
   */
  registerFilter(name, fn) {
    if (typeof name !== 'string' || !name) {
      throw new TypeError('Filter name must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new TypeError('Filter must be a function');
    }
    this.#filters.set(name, fn);
  }

  /**
   * Read a template file from disk and render it.
   * @param {string} templatePath — absolute or relative path to the template file
   * @param {Record<string, *>} [data={}]
   * @returns {Promise<string>} rendered output
   */
  async renderFile(templatePath, data = {}) {
    const absPath = resolve(templatePath);
    const content = await readFile(absPath, 'utf-8');
    return this.render(content, data);
  }

  /**
   * Bulk-register multiple partials from an object map.
   * @param {Record<string, string>} partialsMap — { name: templateString, ... }
   */
  registerPartials(partialsMap) {
    if (partialsMap && typeof partialsMap === 'object') {
      for (const [name, tpl] of Object.entries(partialsMap)) {
        this.registerPartial(name, tpl);
      }
    }
  }

  /**
   * List all registered partial names.
   * @returns {string[]}
   */
  listPartials() {
    return [...this.#partials.keys()];
  }

  /**
   * List all registered filter names.
   * @returns {string[]}
   */
  listFilters() {
    return [...this.#filters.keys()];
  }

  // -----------------------------------------------------------------------
  // Private — block processing
  // -----------------------------------------------------------------------

  /**
   * Process all block-level helpers: {{#if}}, {{#unless}}, {{#each}}.
   * Handles nesting by processing from the inside out.
   * @param {string} src
   * @param {Record<string, *>} data
   * @returns {string}
   */
  #processBlocks(src, data) {
    // Process innermost blocks first (handles nesting)
    let prev;
    do {
      prev = src;
      src = this.#processIfBlocks(src, data);
      src = this.#processUnlessBlocks(src, data);
      src = this.#processEachBlocks(src, data);
    } while (src !== prev);

    return src;
  }

  /**
   * Process {{#if condition}}...{{else}}...{{/if}} blocks.
   * Handles the innermost block on each pass.
   * @param {string} src
   * @param {Record<string, *>} data
   * @returns {string}
   */
  #processIfBlocks(src, data) {
    // Match the innermost {{#if ...}}...{{/if}} (no nested #if inside)
    const re = /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/;
    let match;

    while ((match = re.exec(src)) !== null) {
      const conditionExpr = match[1].trim();
      const body = match[2];

      const conditionValue = this.#evaluateCondition(conditionExpr, data);

      // Split on {{else}}
      const elseParts = body.split(/\{\{else\}\}/);
      const trueBranch = elseParts[0];
      const falseBranch = elseParts.length > 1 ? elseParts.slice(1).join('{{else}}') : '';

      const replacement = conditionValue ? trueBranch : falseBranch;
      src = src.slice(0, match.index) + replacement + src.slice(match.index + match[0].length);
    }

    return src;
  }

  /**
   * Process {{#unless condition}}...{{/unless}} blocks.
   * @param {string} src
   * @param {Record<string, *>} data
   * @returns {string}
   */
  #processUnlessBlocks(src, data) {
    const re = /\{\{#unless\s+(.+?)\}\}([\s\S]*?)\{\{\/unless\}\}/;
    let match;

    while ((match = re.exec(src)) !== null) {
      const conditionExpr = match[1].trim();
      const body = match[2];

      const conditionValue = this.#evaluateCondition(conditionExpr, data);
      const replacement = conditionValue ? '' : body;
      src = src.slice(0, match.index) + replacement + src.slice(match.index + match[0].length);
    }

    return src;
  }

  /**
   * Process {{#each items}}...{{/each}} blocks.
   * Supports {{.}}, {{@index}}, {{@key}}, {{@first}}, {{@last}} inside.
   * When iterating an array of objects, object keys are merged into the data context.
   * @param {string} src
   * @param {Record<string, *>} data
   * @returns {string}
   */
  #processEachBlocks(src, data) {
    const re = /\{\{#each\s+(.+?)\}\}([\s\S]*?)\{\{\/each\}\}/;
    let match;

    while ((match = re.exec(src)) !== null) {
      const varName = match[1].trim();
      const body = match[2];

      const items = this.#resolve(varName, data);
      let result = '';

      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const isObject = item !== null && typeof item === 'object' && !Array.isArray(item);
          const loopCtx = {
            ...data,
            ...(isObject ? item : {}),
            '.': item,
            '@index': i,
            '@key': i,
            '@first': i === 0,
            '@last': i === items.length - 1,
          };
          result += this.render(body, loopCtx);
        }
      } else if (items && typeof items === 'object') {
        const keys = Object.keys(items);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = items[key];
          const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
          const loopCtx = {
            ...data,
            ...(isObject ? value : {}),
            '.': value,
            '@index': i,
            '@key': key,
            '@first': i === 0,
            '@last': i === keys.length - 1,
          };
          result += this.render(body, loopCtx);
        }
      }

      src = src.slice(0, match.index) + result + src.slice(match.index + match[0].length);
    }

    return src;
  }

  // -----------------------------------------------------------------------
  // Private — partials
  // -----------------------------------------------------------------------

  /**
   * Replace {{> partialName}} with the rendered partial.
   * @param {string} src
   * @param {Record<string, *>} data
   * @returns {string}
   */
  #processPartials(src, data) {
    const re = /\{\{>\s*(\S+?)\s*\}\}/g;
    return src.replace(re, (_full, name) => {
      const partial = this.#partials.get(name);
      if (partial === undefined) {
        return `{{> ${name}}}`;  // leave unresolved for debugging
      }
      return this.render(partial, data);
    });
  }

  // -----------------------------------------------------------------------
  // Private — variable interpolation
  // -----------------------------------------------------------------------

  /**
   * Replace {{variable}}, {{variable | filter}}, {{nested.path}} expressions.
   * @param {string} src
   * @param {Record<string, *>} data
   * @returns {string}
   */
  #processVariables(src, data) {
    const re = /\{\{([^#\/!>][^}]*?)\}\}/g;

    return src.replace(re, (_full, expression) => {
      const trimmed = expression.trim();

      // Split by pipe to extract filters
      const segments = trimmed.split('|').map((s) => s.trim());
      const varPath = segments[0];
      const filters = segments.slice(1);

      let value = this.#resolve(varPath, data);

      // If value is undefined/null, return empty string
      if (value === undefined || value === null) {
        return '';
      }

      // Apply filters in order
      let result = String(value);
      for (const filterName of filters) {
        const fn = this.#filters.get(filterName);
        if (fn) {
          result = fn(result);
        } else {
          // Unknown filter — leave value as-is and warn in dev
          // (no throw so rendering is resilient)
        }
      }

      return result;
    });
  }

  // -----------------------------------------------------------------------
  // Private — utilities
  // -----------------------------------------------------------------------

  /**
   * Resolve a dotted path against a data object.
   * Handles special loop variables (., @index, @key, @first, @last).
   * @param {string} path
   * @param {Record<string, *>} data
   * @returns {*}
   */
  #resolve(path, data) {
    if (!path) return undefined;

    // Special loop variables
    if (path === '.' || path.startsWith('@')) {
      return data[path];
    }

    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Evaluate a condition expression for {{#if}} / {{#unless}}.
   * Supports simple truthy checks as well as basic comparisons:
   *   variable
   *   variable == "value"
   *   variable != "value"
   *   variable === "value"
   *   variable !== "value"
   * @param {string} expr
   * @param {Record<string, *>} data
   * @returns {boolean}
   */
  #evaluateCondition(expr, data) {
    // Try comparison operators
    const comparisonRe = /^(.+?)\s*(===|!==|==|!=)\s*(.+)$/;
    const cm = comparisonRe.exec(expr);

    if (cm) {
      const left = this.#resolveValue(cm[1].trim(), data);
      const operator = cm[2];
      const right = this.#resolveValue(cm[3].trim(), data);

      switch (operator) {
        case '==':  return left == right;  // eslint-disable-line eqeqeq
        case '!=':  return left != right;  // eslint-disable-line eqeqeq
        case '===': return left === right;
        case '!==': return left !== right;
        default:    return false;
      }
    }

    // Negation: !variable
    if (expr.startsWith('!')) {
      return !this.#isTruthy(this.#resolve(expr.slice(1).trim(), data));
    }

    // Simple truthy check
    return this.#isTruthy(this.#resolve(expr, data));
  }

  /**
   * Resolve a value that may be a quoted string literal, a number, a boolean,
   * or a variable path.
   * @param {string} token
   * @param {Record<string, *>} data
   * @returns {*}
   */
  #resolveValue(token, data) {
    // Quoted string literals
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    // Boolean literals
    if (token === 'true') return true;
    if (token === 'false') return false;
    if (token === 'null') return null;
    if (token === 'undefined') return undefined;
    // Numeric literals
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      return Number(token);
    }
    // Variable path
    return this.#resolve(token, data);
  }

  /**
   * Determine whether a value is "truthy" in the template sense.
   * Empty arrays and empty strings are falsy.
   * @param {*} value
   * @returns {boolean}
   */
  #isTruthy(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value === '') return false;
    return !!value;
  }
}

export default TemplateEngine;
export { TemplateEngine };
