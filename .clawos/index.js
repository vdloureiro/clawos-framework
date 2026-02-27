/**
 * @module ClawOS
 * @description ClawOS Framework — Intelligent meta-framework that builds production-ready frameworks.
 *
 * @example
 * import ClawOS from '@clawos/framework';
 *
 * // Detect domain from user input
 * const detection = ClawOS.detectDomain('I need a REST API framework');
 *
 * // Start elicitation
 * const elicitation = ClawOS.createElicitation(detection.primary.domain);
 *
 * // Get the full pipeline
 * const pipeline = ClawOS.createPipeline();
 * await pipeline.run({ userInput: 'REST API framework with auth' });
 *
 * @author Victor De Marco
 * @license MIT
 * @version 1.0.0
 */

// Core modules
export {
  MasterOrchestrator,
  createOrchestrator,
  PipelineExecutor,
  createPipelineExecutor,
  PhaseManager,
  Phase,
  OrchestratorState,
  createPhaseManager,
  ElicitationEngine,
  createElicitation,
  detectDomain,
  getSupportedDomains,
  getQuestionsForDomain,
  getAllQuestions,
  BlueprintEngine,
  BlueprintRegistry,
  GeneratorEngine,
  FileGenerator,
  CodeGenerator,
  ConfigGenerator,
  TemplateEngine,
  TemplateRegistry,
  StructureValidator,
  createStructureValidator,
  IntegrityChecker,
  createIntegrityChecker,
  ConfigResolver,
  createConfigResolver,
  CONFIG_SCHEMA,
  validateConfig,
  getDefaults,
  RegistryManager,
  getRegistryManager,
  ClawEventBus,
  ClawEvent,
  getEventBus,
  ClaudeMdGenerator,
  CommandGenerator,
  McpConfigurator,
} from './core/index.js';

// Domain knowledge
export { DOMAINS, getDomain, getDomainIds, getDomainSummaries } from './domains/index.js';

// Architecture archetypes
export { ARCHETYPES, getArchetype, getArchetypeIds, getArchetypesForDomain, getArchetypeSummaries } from './archetypes/index.js';

/**
 * ClawOS Framework version.
 * @type {string}
 */
export const VERSION = '1.0.0';

/**
 * ClawOS Framework identity.
 * @type {object}
 */
export const IDENTITY = Object.freeze({
  name: 'ClawOS Framework',
  version: VERSION,
  description: 'Intelligent meta-framework that builds production-ready frameworks',
  author: 'Victor De Marco',
});
