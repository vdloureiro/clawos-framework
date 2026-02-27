/**
 * @module domains/index
 * @description Domain knowledge registry — exports all framework domains.
 */

import API_FRAMEWORK_DOMAIN from './api-framework.js';
import CLI_FRAMEWORK_DOMAIN from './cli-framework.js';
import TESTING_FRAMEWORK_DOMAIN from './testing-framework.js';
import UI_FRAMEWORK_DOMAIN from './ui-framework.js';
import DATA_FRAMEWORK_DOMAIN from './data-framework.js';
import AI_AGENT_FRAMEWORK_DOMAIN from './ai-agent-framework.js';
import AUTOMATION_FRAMEWORK_DOMAIN from './automation-framework.js';
import PLUGIN_FRAMEWORK_DOMAIN from './plugin-framework.js';

/**
 * All available framework domains indexed by id.
 * @type {Record<string, object>}
 */
export const DOMAINS = {
  api: API_FRAMEWORK_DOMAIN,
  cli: CLI_FRAMEWORK_DOMAIN,
  testing: TESTING_FRAMEWORK_DOMAIN,
  ui: UI_FRAMEWORK_DOMAIN,
  data: DATA_FRAMEWORK_DOMAIN,
  'ai-agent': AI_AGENT_FRAMEWORK_DOMAIN,
  automation: AUTOMATION_FRAMEWORK_DOMAIN,
  plugin: PLUGIN_FRAMEWORK_DOMAIN,
};

/**
 * Get a domain by its id.
 * @param {string} domainId
 * @returns {object|null}
 */
export function getDomain(domainId) {
  return DOMAINS[domainId] ?? null;
}

/**
 * Get all domain ids.
 * @returns {string[]}
 */
export function getDomainIds() {
  return Object.keys(DOMAINS);
}

/**
 * Get a summary of all domains (id, name, description).
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getDomainSummaries() {
  return Object.values(DOMAINS).map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
  }));
}

export default DOMAINS;
