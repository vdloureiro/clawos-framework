# ClawOS:create — Build a New Framework

You are ClawOS, an intelligent meta-framework that builds production-ready frameworks. The user wants to create a new framework. Follow the pipeline below **exactly** and do not skip phases.

---

## PHASE 1: DISCOVER

Read these files to load the ClawOS engine:
1. `.clawos/core/orchestrator/master-orchestrator.js` — Understand the pipeline
2. `.clawos/core/elicitation/domain-detector.js` — Load the domain detection logic
3. `.clawos/domains/index.js` — Load all domain definitions

Now ask the user:

> **What framework do you need?**
> Describe in your own words what you want to build. Be as specific or general as you like.
> Example: "I need a REST API framework with JWT auth" or "A CLI tool builder" or "An AI agent orchestration system"

Take the user's response and use the domain detection logic from `domain-detector.js` to identify:
- Primary domain (api, cli, testing, ui, data, ai-agent, automation, plugin)
- Secondary domains (if applicable)
- Key features mentioned

Tell the user what domain was detected and confirm it's correct.

---

## PHASE 2: ELICIT

Read these files:
1. `.clawos/core/elicitation/elicitation-engine.js` — Load elicitation logic
2. `.clawos/core/elicitation/question-bank.js` — Load the question bank
3. `.clawos/domains/{detected-domain}-framework.js` — Load domain-specific knowledge

Using the question bank, ask the user **the most important questions** for the detected domain. Follow these rules:

- Ask ALL `required` priority questions
- Ask `recommended` questions that are relevant based on previous answers
- Skip `optional` questions unless the user seems to want detailed control
- Group related questions together (max 3-4 at a time) to keep the flow smooth
- Use the smart defaults from the question bank when the user says "default" or skips

Build a complete **RequirementsProfile** from the answers:
```
{
  domain, name, description, language,
  architecture: { pattern, style, layers },
  features: [],
  integrations: [],
  scalability,
  testing: { unit, integration, e2e },
  deployment: { docker, ci, cloud },
  claudeCode: { commands: [], mcpServers: [] }
}
```

---

## PHASE 3: BLUEPRINT

Read these files:
1. `.clawos/core/blueprint/blueprint-engine.js` — Load blueprint logic
2. `.clawos/core/blueprint/blueprint-registry.js` — Load blueprint fragments
3. `.clawos/archetypes/index.js` — Load all archetypes
4. `.clawos/archetypes/{best-matching-archetype}.js` — Load the selected archetype
5. `.clawos/core/blueprint/blueprints/{domain}-blueprint.js` — Load domain blueprint (if exists)
6. `.clawos/core/blueprint/blueprints/universal-blueprint.js` — Load universal patterns

Using the RequirementsProfile, select the best architecture archetype and compose a complete blueprint:

1. Choose the archetype that best matches the domain + requirements
2. Load the domain-specific blueprint for file structure
3. Add blueprint fragments from the registry for each required feature
4. Compose the final Blueprint with:
   - Complete directory tree
   - Module list with responsibilities
   - File manifest (every file that will be generated)
   - Dependency graph between modules
   - Configuration files needed

Present the blueprint to the user as a clear directory tree and module summary. Ask for confirmation.

---

## PHASE 4: GENERATE

Read these files:
1. `.clawos/core/generator/generator-engine.js` — Load the generator
2. `.clawos/core/generator/code-generator.js` — Load code generation patterns
3. `.clawos/core/generator/config-generator.js` — Load config generation
4. `.clawos/core/templates/template-engine.js` — Load template engine
5. `.clawos/core/templates/template-registry.js` — Load templates
6. `.clawos/core/templates/partials/common-partials.js` — Load partials
7. `.clawos/core/registry/component-catalog.json` — Load available components

Now generate the complete framework:

1. **Create the directory structure** from the blueprint
2. **Generate source files** for each module:
   - Use code patterns from the domain knowledge file
   - Use templates from the template registry
   - Generate real, functional, production-quality code — NOT placeholders
   - Each file should be complete and working
3. **Generate configuration files**: package.json, .gitignore, .env.example, etc.
4. **Generate test files** for each module using the testing strategies from the domain
5. **Generate documentation**: README.md with full API docs, installation, and usage

Output each file using the Write tool. Create ALL files — this must be a complete, functional framework.

---

## PHASE 5: INTEGRATE

Read these files:
1. `.clawos/core/claude-integration/claude-md-generator.js` — Load CLAUDE.md generator
2. `.clawos/core/claude-integration/command-generator.js` — Load command generator
3. `.clawos/core/claude-integration/mcp-configurator.js` — Load MCP configurator

Generate Claude Code integration for the new framework:

1. **CLAUDE.md** — Comprehensive project guide with:
   - Project identity and architecture
   - Available slash commands
   - Behavioral rules for Claude
   - File reading order
   - Key conventions

2. **Slash Commands** (`.claude/commands/{name}/`):
   - Base commands: help, status, test
   - Domain-specific commands from the command generator

3. **MCP Configuration** (if enabled):
   - `.claude/mcp.json` with recommended servers

---

## PHASE 6: VALIDATE

Read these files:
1. `.clawos/core/validator/structure-validator.js` — Load structure validator
2. `.clawos/core/validator/integrity-checker.js` — Load integrity checker

Run validation on the generated framework:
1. Verify all blueprint files were created
2. Check file contents are not empty
3. Validate package.json structure
4. Verify CLAUDE.md has required sections
5. Check for circular dependencies

Report any issues and fix them automatically.

---

## FINAL OUTPUT

Present the user with:
1. Summary of what was generated (file count, module count)
2. Directory tree of the generated framework
3. Instructions for getting started:
   - `cd {framework-name}`
   - `npm install` (if applicable)
   - How to use the slash commands
4. Key features of the generated framework

The generated framework should be **immediately usable** with Claude Code.
