# opencode-workspace

> Plan before you build. Structured implementation plans with rule injection.

A plugin for [OpenCode](https://github.com/sst/opencode) that adds planning workflows and agent coordination. Save implementation plans, track phases, and get context-aware rules injected based on which agent is active.

## Why This Exists

Complex tasks need planning. Without structure, AI dives straight into code - missing edge cases, duplicating work, forgetting earlier decisions.

This plugin solves that:

- **Phased planning** - Break work into phases with tracked tasks
- **Citation support** - Link decisions to research with `ref:delegation-id`
- **Targeted rules** - Different agents get different instructions automatically
- **Survives compaction** - Plans are saved to disk and re-injected when context compacts

## Installation

Install via [OCX](https://github.com/kdcokenny/ocx), the package manager for OpenCode extensions:

```bash
# Install OCX
curl -fsSL https://ocx.kdco.dev/install.sh | sh

# Initialize and add the plugin
ocx init
ocx registry add --name kdco https://registry.kdco.dev
ocx add kdco/workspace
```

## How It Works

```
1. Plan        →  AI creates phased implementation plan
2. Validate    →  plan_save validates structure before saving
3. Execute     →  Each phase has tracked tasks with ← CURRENT marker
4. Recover     →  Plan survives context compaction and session restarts
```

Plans are stored in `~/.local/share/opencode/workspace/<project-hash>/<session-id>/plan.md`.

## Usage

The plugin adds two tools:

| Tool | Purpose |
|------|---------|
| `plan_save(content)` | Save the implementation plan as markdown. Must include citations (ref:delegation-id) for decisions based on research. Plan is validated before saving. |
| `plan_read(reason)` | Read the current implementation plan for this session. |

### Plan Format

```markdown
---
status: in-progress
phase: 2
updated: 2026-01-07
---

# Implementation Plan

## Goal
Add dark mode support with system preference detection.

## Context & Decisions
| Decision | Rationale | Source |
|----------|-----------|--------|
| Use CSS custom properties | Better performance than class toggling | `ref:swift-tiger-moon` |
| Prefer prefers-color-scheme | Native, no JS required for initial load | `ref:bold-eagle-star` |

## Phase 1: Research [COMPLETE]
- [x] 1.1 Research dark mode best practices → `ref:swift-tiger-moon`
- [x] 1.2 Audit existing color usage in codebase

## Phase 2: Implementation [IN PROGRESS]
- [x] 2.1 Create CSS custom property system
- [ ] **2.2 Add theme toggle component** ← CURRENT
- [ ] 2.3 Implement system preference detection

## Phase 3: Polish [PENDING]
- [ ] 3.1 Add transition animations
- [ ] 3.2 Persist user preference to localStorage
```

### Validation Rules

Plans are validated with Zod schemas before saving:

| Rule | Requirement |
|------|-------------|
| Frontmatter | Must have `status`, `phase`, and `updated` (YYYY-MM-DD) |
| Goal | At least 10 characters |
| Phases | At least one phase with at least one task |
| Task IDs | Hierarchical format: `1.1`, `2.3`, etc. |
| Current marker | Only ONE task may have `← CURRENT` |
| Citations | Must follow `ref:word-word-word` format |

If validation fails, you get a detailed error:

```
❌ Plan validation failed:

[phases.1.tasks]: Phase must have at least one task
[frontmatter.updated]: Date must be YYYY-MM-DD

💡 Load skill('plan-protocol') for the full format spec.
```

## Agent Rule Injection

The plugin automatically injects different rules based on which agent is active:

### Plan Agent (`PLAN_RULES`)

Injected when `agent === "plan"`:
- Agent routing boundaries (explore = internal, researcher = external)
- Plan format specification
- Skill loading guidance (code-philosophy, frontend-philosophy)
- Citation requirements

### Build Agent (`BUILD_RULES`)

Injected when `agent === "build"`:
- Orchestrator delegation mandate (no direct edits, use coder/scribe)
- Verification workflow (delegate bash commands to coder)
- Code review protocol (delegate to reviewer before completion)
- Plan/delegation reading workflow

### Universal Injection

All agents receive:
- Current date awareness (prevents AI from using outdated years in searches)

## Hooks

### Context Compaction Hook

When OpenCode compacts context, the plugin injects:
- Full plan content
- Current task (the one marked `← CURRENT`)
- Instructions to verify citations with `delegation_read()`

This ensures the AI can resume work after compaction without losing track.

### Post-Task Hook

After a `coder` task completes, a reminder is injected:
- Proceed to code review if all work is done
- Delegate to `reviewer` agent
- Include findings in completion report

## FAQ

### How do citations work?

When you use `delegate()` from background-agents, each delegation gets an ID like `swift-tiger-moon`. Reference these in your plan:

```markdown
- [x] 1.2 Research OAuth2 patterns → `ref:swift-tiger-moon`
```

Later, the AI can call `delegation_read("swift-tiger-moon")` to retrieve the full research.

### Does the plan persist across sessions?

Plans are scoped to the root session and survive:
- Context compaction (re-injected automatically)
- Session restarts (loaded from disk)
- Sub-agent sessions (sub-agents access the same plan)

New root sessions start fresh - each major task gets its own plan.

### What if I don't want planning?

You don't have to use it. The tools are available but optional. The rule injection still happens for agent coordination, which helps regardless of whether you use formal plans.

### Can I edit the plan manually?

Yes. Plans are markdown files at `~/.local/share/opencode/workspace/<hash>/<session>/plan.md`. Edit them with any text editor. Next `plan_read()` will load your changes.

## Limitations

### Session Scope

Plans are scoped to the root session. If you start a fresh OpenCode session, you start with no plan. The old plan files remain on disk but aren't loaded automatically.

### Validation Strictness

The Zod validation is intentionally strict. If your plan doesn't follow the format, it won't save. This prevents drift and ensures the plan remains machine-parseable.

## Manual Installation

If you prefer not to use OCX, copy the source from [`src/`](./src) to `.opencode/plugin/`.

**Caveats:**
- Updates require manual re-copying
- No external dependencies required

## Part of the OCX Ecosystem

This plugin is part of the [KDCO Registry](https://github.com/kdcokenny/ocx/tree/main/registry/src/kdco). For the full experience, combine with:

- [opencode-background-agents](https://github.com/kdcokenny/opencode-background-agents) - Async delegation with persistent outputs
- [opencode-worktree](https://github.com/kdcokenny/opencode-worktree) - Isolated git worktrees for AI experiments
- [opencode-notify](https://github.com/kdcokenny/opencode-notify) - Native OS notifications

## License

MIT
