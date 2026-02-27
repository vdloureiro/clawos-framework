/**
 * @module archetypes/index
 * @description Architecture archetype registry — exports all archetypes.
 */

import MICROSERVICE_ARCHETYPE from './microservice.js';
import MONOLITH_ARCHETYPE from './monolith.js';
import EVENT_DRIVEN_ARCHETYPE from './event-driven.js';
import PIPELINE_ARCHETYPE from './pipeline.js';
import MODULAR_ARCHETYPE from './modular.js';

/**
 * All available architecture archetypes indexed by id.
 * @type {Record<string, object>}
 */
export const ARCHETYPES = {
  microservice: MICROSERVICE_ARCHETYPE,
  monolith: MONOLITH_ARCHETYPE,
  'event-driven': EVENT_DRIVEN_ARCHETYPE,
  pipeline: PIPELINE_ARCHETYPE,
  modular: MODULAR_ARCHETYPE,
};

/**
 * Get an archetype by its id.
 * @param {string} archetypeId
 * @returns {object|null}
 */
export function getArchetype(archetypeId) {
  return ARCHETYPES[archetypeId] ?? null;
}

/**
 * Get all archetype ids.
 * @returns {string[]}
 */
export function getArchetypeIds() {
  return Object.keys(ARCHETYPES);
}

/**
 * Get archetypes that are best suited for a given domain.
 * @param {string} domainId
 * @returns {object[]}
 */
export function getArchetypesForDomain(domainId) {
  return Object.values(ARCHETYPES).filter(a => a.bestFor.includes(domainId));
}

/**
 * Get a summary of all archetypes.
 * @returns {Array<{id: string, name: string, description: string, bestFor: string[]}>}
 */
export function getArchetypeSummaries() {
  return Object.values(ARCHETYPES).map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    bestFor: a.bestFor,
  }));
}

export default ARCHETYPES;
