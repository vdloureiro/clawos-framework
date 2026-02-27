# ClawOS Framework — Meta-Framework Builder

> **ClawOS** is an intelligent meta-framework that builds production-ready frameworks.
> Tell it what you need, it asks the right questions, and generates a complete, functional framework
> installable in Claude Code.

## Identity

- **Name**: ClawOS Framework
- **Version**: 1.0.0
- **Purpose**: Build any framework from a natural language description
- **Author**: Victor De Marco

## How It Works

ClawOS operates in 5 phases:

1. **DISCOVER** — Understand what framework the user needs
2. **ELICIT** — Ask intelligent, domain-aware questions to refine requirements
3. **BLUEPRINT** — Select and compose architecture patterns
4. **GENERATE** — Create the complete framework with all files, configs, and docs
5. **INTEGRATE** — Set up Claude Code integration (CLAUDE.md, slash commands, MCP)

## Quick Start

Use the slash command:
```
/ClawOS:create
```

This triggers the full pipeline. ClawOS will guide you through the process.

## Available Commands

| Command | Description |
|---------|-------------|
| `/ClawOS:create` | Create a new framework from scratch (full pipeline) |
| `/ClawOS:blueprint` | Generate only the architecture blueprint |
| `/ClawOS:extend` | Add modules/features to an existing generated framework |
| `/ClawOS:validate` | Validate a generated framework's integrity |

## Architecture Overview

```
ClawOS Framework
├── .clawos/                    # Core engine
│   ├── core/
│   │   ├── orchestrator/       # Pipeline orchestration (5 phases)
│   │   ├── elicitation/        # Smart question engine
│   │   ├── blueprint/          # Architecture pattern library
│   │   ├── generator/          # Code generation engine
│   │   ├── templates/          # Template system
│   │   ├── validator/          # Output validation
│   │   ├── config/             # Configuration management
│   │   ├── registry/           # Component catalog
│   │   ├── claude-integration/ # Claude Code output generators
│   │   └── events/             # Event system
│   ├── domains/                # Framework domain knowledge (8 domains)
│   └── archetypes/             # Architecture archetypes (5 patterns)
└── .claude/commands/ClawOS/    # Slash commands for Claude Code
```

## Core Principles

1. **Domain Intelligence** — Deep knowledge of 8+ framework domains (API, CLI, Testing, UI, Data, AI-Agent, Automation, Plugin)
2. **Architecture-First** — Every framework starts from a proven archetype (Microservice, Monolith, Event-Driven, Pipeline, Modular)
3. **Production-Ready** — Generated frameworks include tests, CI/CD, docs, error handling, and logging
4. **Claude Code Native** — Every generated framework comes with CLAUDE.md, slash commands, and MCP configuration
5. **Extensible** — Both ClawOS itself and generated frameworks are designed for extensibility

## Configuration

ClawOS uses a 3-layer configuration:

- **L1 Framework**: Built-in defaults (`.clawos/core/config/`)
- **L2 Project**: Project-level overrides (`.clawos-config.yaml`)
- **L3 User**: User preferences (`~/.clawos/preferences.yaml`)

## Domain Knowledge

ClawOS has deep knowledge of these framework domains:

| Domain | Description | Example Outputs |
|--------|-------------|-----------------|
| `api` | REST/GraphQL API frameworks | Express-like, Fastify-like, Hono-like |
| `cli` | Command-line tool frameworks | Commander-like, Oclif-like |
| `testing` | Testing frameworks | Jest-like, Playwright-like |
| `ui` | UI component frameworks | React-like component systems |
| `data` | Data processing pipelines | ETL frameworks, stream processors |
| `ai-agent` | AI agent orchestration | Multi-agent systems, tool frameworks |
| `automation` | Workflow automation | Task runners, CI/CD frameworks |
| `plugin` | Plugin/extension systems | VSCode-like extension frameworks |

## Behavioral Rules

- ALWAYS read the domain knowledge files before generating a framework
- ALWAYS follow the 5-phase pipeline (DISCOVER → ELICIT → BLUEPRINT → GENERATE → INTEGRATE)
- ALWAYS validate the generated framework before presenting it
- ALWAYS generate Claude Code integration files (CLAUDE.md, commands)
- NEVER skip the elicitation phase — understanding requirements is critical
- NEVER generate partial frameworks — every output must be complete and functional
- When using the blueprint system, read `.clawos/core/blueprint/blueprints/` for available patterns
- When generating code, read `.clawos/core/templates/` for available templates
- Read `.clawos/domains/` to load domain-specific knowledge for the requested framework type
- Read `.clawos/archetypes/` to understand architecture patterns

## File Reading Order

When executing `/ClawOS:create`, read files in this order:

1. `.clawos/core/orchestrator/master-orchestrator.js` — Understand the pipeline
2. `.clawos/core/elicitation/elicitation-engine.js` — Load elicitation logic
3. `.clawos/core/elicitation/domain-detector.js` — Detect the domain
4. `.clawos/domains/{detected-domain}.js` — Load domain knowledge
5. `.clawos/core/elicitation/question-bank.js` — Get domain-specific questions
6. `.clawos/core/blueprint/blueprint-engine.js` — Load blueprint logic
7. `.clawos/archetypes/{selected-archetype}.js` — Load archetype
8. `.clawos/core/generator/generator-engine.js` — Load generator
9. `.clawos/core/templates/template-engine.js` — Load templates
10. `.clawos/core/claude-integration/claude-md-generator.js` — Generate Claude integration
11. `.clawos/core/validator/structure-validator.js` — Validate output

## Output Structure

Every generated framework follows this structure:

```
{framework-name}/
├── CLAUDE.md                    # Claude Code integration
├── package.json                 # Package definition
├── .claude/commands/            # Slash commands
├── src/                         # Source code
│   ├── core/                    # Core modules
│   ├── plugins/                 # Plugin system (if applicable)
│   ├── utils/                   # Utilities
│   └── index.js                 # Entry point
├── tests/                       # Test suite
├── docs/                        # Documentation
├── .github/                     # CI/CD workflows
└── {domain-specific-dirs}/      # Based on framework type
```
