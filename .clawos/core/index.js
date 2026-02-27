/**
 * @module core/index
 * @description ClawOS Core — exports all core modules.
 * This is the main entry point for the ClawOS engine.
 */

// Orchestrator
export { MasterOrchestrator, createOrchestrator } from './orchestrator/master-orchestrator.js';
export { PipelineExecutor, createPipelineExecutor } from './orchestrator/pipeline-executor.js';
export { PhaseManager, Phase, OrchestratorState, createPhaseManager } from './orchestrator/phase-manager.js';

// Elicitation
export { ElicitationEngine, createElicitation } from './elicitation/elicitation-engine.js';
export { detectDomain, getSupportedDomains } from './elicitation/domain-detector.js';
export { getQuestionsForDomain, getAllQuestions } from './elicitation/question-bank.js';

// Blueprint
export { BlueprintEngine } from './blueprint/blueprint-engine.js';
export { BlueprintRegistry } from './blueprint/blueprint-registry.js';

// Generator
export { GeneratorEngine } from './generator/generator-engine.js';
export { FileGenerator } from './generator/file-generator.js';
export { CodeGenerator } from './generator/code-generator.js';
export { ConfigGenerator } from './generator/config-generator.js';

// Templates
export { TemplateEngine } from './templates/template-engine.js';
export { TemplateRegistry } from './templates/template-registry.js';

// Validator
export { StructureValidator, createStructureValidator } from './validator/structure-validator.js';
export { IntegrityChecker, createIntegrityChecker } from './validator/integrity-checker.js';

// Config
export { ConfigResolver, createConfigResolver } from './config/config-resolver.js';
export { CONFIG_SCHEMA, validateConfig, getDefaults } from './config/config-schema.js';

// Registry
export { RegistryManager, getRegistryManager } from './registry/registry-manager.js';

// Events
export { ClawEventBus, ClawEvent, getEventBus } from './events/event-bus.js';

// Claude Integration
export { ClaudeMdGenerator } from './claude-integration/claude-md-generator.js';
export { CommandGenerator } from './claude-integration/command-generator.js';
export { McpConfigurator } from './claude-integration/mcp-configurator.js';
