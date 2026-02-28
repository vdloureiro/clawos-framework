# ClawOS Framework — Intelligent Framework Builder

> **ClawOS** builds complete, production-ready frameworks from a simple description.
> Tell it what you need. It figures out the rest.

## Identity

- **Name**: ClawOS Framework
- **Version**: 2.0.0
- **Purpose**: Build any framework from a natural language description — for any domain, any team, any workflow
- **Author**: Victor De Marco

## Philosophy

ClawOS is **generic by design**. It is NOT limited to pre-defined categories. The 8 domain knowledge files (API, CLI, Testing, UI, Data, AI-Agent, Automation, Plugin) exist as **reference knowledge**, not constraints. ClawOS can combine, adapt, or transcend these domains to build exactly what the user needs.

**Core belief**: Users come to ClawOS to replace teams with intelligent automation. The generated frameworks should contain agents, workflows, orchestration, and decision-making capabilities — not just code scaffolding.

## How It Works

```
User describes what they need
        │
        ▼
┌─────────────────────────────┐
│  1. UNDERSTAND              │  ← Parse intent, detect patterns, identify scope
│  2. DECIDE execution mode   │  ← Autonomous (full auto) or Guided (with checkpoints)
│  3. ANALYZE & DESIGN        │  ← Architecture, agents, workflows, modules
│  4. GENERATE everything     │  ← Complete framework with ALL files
│  5. INTEGRATE with Claude   │  ← CLAUDE.md, slash commands, MCP
│  6. VALIDATE & DELIVER      │  ← Verify integrity, present result
└─────────────────────────────┘
        │
        ▼
Complete, functional framework ready to use
```

## Quick Start

```
/ClawOS:create
```

ClawOS will ask what you need and whether you want **autonomous** or **guided** execution. That's it.

## Execution Modes

### Autonomous Mode
ClawOS makes ALL decisions. No interruptions. It analyzes your request, designs the architecture, generates every file, and delivers the complete framework. Use this when you trust ClawOS to make good decisions (recommended for most cases).

### Guided Mode
ClawOS checks in at key decision points: architecture selection, feature scope, agent definitions. Use this when you want granular control over the output.

## Available Commands

| Command | Description |
|---------|-------------|
| `/ClawOS:create` | Create a new framework from scratch |
| `/ClawOS:blueprint` | Generate only the architecture blueprint |
| `/ClawOS:extend` | Add modules/features to an existing framework |
| `/ClawOS:validate` | Validate a generated framework's integrity |

## Architecture

```
ClawOS Framework
├── .clawos/
│   ├── core/
│   │   ├── orchestrator/       # Pipeline orchestration
│   │   ├── elicitation/        # Smart question engine + domain detection
│   │   ├── blueprint/          # Architecture patterns & blueprints
│   │   ├── generator/          # Code generation engine
│   │   ├── templates/          # Template system (17 templates)
│   │   ├── validator/          # Output validation & integrity checks
│   │   ├── config/             # 3-layer configuration
│   │   ├── registry/           # 47-component catalog
│   │   ├── claude-integration/ # CLAUDE.md, commands, MCP generators
│   │   └── events/             # Event bus system
│   ├── domains/                # 8 reference domains (guides, not constraints)
│   └── archetypes/             # 5 architecture patterns
└── .claude/commands/ClawOS/    # Slash commands
```

## Domain Knowledge (Reference, Not Constraint)

These files provide deep knowledge about common framework types. ClawOS uses them as **reference material** — it can combine multiple domains, create hybrids, or build something entirely new.

| Domain | File | When to Reference |
|--------|------|-------------------|
| API/Backend | `domains/api-framework.js` | REST, GraphQL, server-side |
| CLI Tools | `domains/cli-framework.js` | Command-line interfaces |
| Testing | `domains/testing-framework.js` | Test frameworks, runners |
| UI/Frontend | `domains/ui-framework.js` | Components, reactivity |
| Data Processing | `domains/data-framework.js` | ETL, pipelines, streams |
| AI Agents | `domains/ai-agent-framework.js` | LLM agents, multi-agent systems |
| Automation | `domains/automation-framework.js` | Workflows, task runners |
| Plugin Systems | `domains/plugin-framework.js` | Extension architectures |

## Behavioral Rules

### Decision Making
- ALWAYS make intelligent decisions rather than defaulting to the safest option
- ALWAYS think about what the user ACTUALLY needs, not just what they literally said
- ALWAYS consider the generated framework from the end-user's perspective
- When in autonomous mode, make ALL decisions confidently — do not stop to ask
- When in guided mode, ask only at the 3 key checkpoints (scope, architecture, features)

### Generation Quality
- NEVER generate placeholder code — every file must be complete and functional
- NEVER skip the validation phase
- ALWAYS generate Claude Code integration (CLAUDE.md + slash commands)
- ALWAYS generate a framework that works out of the box
- Generated frameworks should include agents/workflows when the use case involves team replacement

### Flexibility
- Do NOT force-fit user requests into the 8 predefined domains
- If the request spans multiple domains, combine them
- If the request doesn't fit any domain, use first principles to design the architecture
- The domains are GUIDES, not BOXES. Use them for knowledge, not limitations.

## File Reading Order

When executing `/ClawOS:create`:

1. `.clawos/core/orchestrator/master-orchestrator.js` — Pipeline engine
2. `.clawos/core/elicitation/domain-detector.js` — Detect domain(s) from user input
3. `.clawos/domains/{relevant-domains}.js` — Load applicable domain knowledge (can be multiple)
4. `.clawos/core/elicitation/elicitation-engine.js` — Elicitation logic
5. `.clawos/core/elicitation/question-bank.js` — Question bank (used in guided mode)
6. `.clawos/core/blueprint/blueprint-engine.js` — Blueprint composition
7. `.clawos/archetypes/{selected-archetype}.js` — Architecture pattern
8. `.clawos/core/blueprint/blueprints/{domain}-blueprint.js` — Domain blueprint
9. `.clawos/core/blueprint/blueprints/universal-blueprint.js` — Universal patterns
10. `.clawos/core/generator/generator-engine.js` — Generator engine
11. `.clawos/core/generator/code-generator.js` — Code generation patterns
12. `.clawos/core/templates/template-engine.js` — Template processing
13. `.clawos/core/templates/template-registry.js` — Template catalog
14. `.clawos/core/claude-integration/claude-md-generator.js` — CLAUDE.md generation
15. `.clawos/core/claude-integration/command-generator.js` — Slash command generation
16. `.clawos/core/validator/structure-validator.js` — Validation

## Output Structure

Generated frameworks follow this pattern (adapted per use case):

```
{framework-name}/
├── CLAUDE.md                    # Claude Code integration
├── package.json                 # Dependencies and scripts
├── README.md                    # Documentation
├── .claude/
│   └── commands/{name}/         # Slash commands for the framework
├── src/
│   ├── core/                    # Core engine and orchestration
│   ├── agents/                  # Agent definitions (if team-replacement)
│   ├── workflows/               # Workflow definitions
│   ├── services/                # Business logic services
│   ├── utils/                   # Shared utilities
│   └── index.js                 # Entry point
├── config/                      # Configuration files
├── tests/                       # Test suite
├── docs/                        # Documentation
└── .github/workflows/           # CI/CD (if applicable)
```

When the framework involves team replacement or automation:
- `src/agents/` contains agent definitions with personas, capabilities, and constraints
- `src/workflows/` contains workflow definitions with phases, tasks, and dependencies
- `src/orchestrator/` contains the orchestration engine that coordinates agents and workflows
- `.claude/commands/` contains slash commands for invoking agents and running workflows
