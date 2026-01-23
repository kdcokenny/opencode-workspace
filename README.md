# opencode-workspace

Bundled multi-agent orchestration harness for OpenCode. One install, complete control.

## What This Is

A **bundle** — a curated collection of 16 components that work together as a complete AI development harness. Installing `kdco/workspace` gives you:

- 4 plugins (delegation, planning, notifications, worktrees)
- 2 npm plugins (DCP, markdown table formatter)
- 3 MCP servers (Context7, Exa, GitHub Grep)
- 4 agents (researcher, coder, scribe, reviewer)
- 4 skills (plan protocol, code review, code philosophy, frontend philosophy)
- 1 command (/review)
- Orchestrator configurations for plan/build/explore agents
- Permission boundaries (webfetch deny, agent sandboxing)

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     ORCHESTRATORS                        │
│         ┌──────┐                    ┌───────┐            │
│         │ plan │                    │ build │            │
│         └──┬───┘                    └───┬───┘            │
└────────────┼────────────────────────────┼────────────────┘
             │                            │
     ┌───────┴───────┐            ┌───────┴───────┐
     ▼       ▼       ▼            ▼       ▼       ▼
┌─────────────────────────────────────────────────────────┐
│                      SPECIALISTS                        │
│  ┌─────────┐ ┌────────────┐ ┌───────┐ ┌──────┐ ┌──────┐ │
│  │ explore │ │ researcher │ │ coder │ │scribe│ │review│ │
│  └─────────┘ └────────────┘ └───────┘ └──────┘ └──────┘ │
└─────────────────────────────────────────────────────────┘
```

| Role          | Agents                                             |
| ------------- | -------------------------------------------------- |
| Orchestrators | `plan`, `build`                                    |
| Specialists   | `explore`, `researcher`, `coder`, `scribe`, `reviewer` |

## Components

| Category | Component           | Description                                  |
| -------- | ------------------- | -------------------------------------------- |
| Plugin   | workspace-plugin    | Plan management, agent rule injection        |
| Plugin   | background-agents   | Async delegation system                      |
| Plugin   | notify              | OS notifications on completion               |
| Plugin   | worktree            | Git worktree isolation                       |
| Plugin   | @tarquinen/opencode-dcp | Differential context protocol          |
| Plugin   | @franlol/opencode-md-table-formatter | Markdown table formatting |
| Skill    | plan-protocol       | Implementation planning guidelines           |
| Skill    | code-review         | Review methodology + severity classification |
| Skill    | code-philosophy     | Internal logic philosophy (5 Laws)           |
| Skill    | frontend-philosophy | Visual/UI philosophy (5 Pillars)             |
| Agent    | researcher          | External research (MCP tools, read-only)     |
| Agent    | coder               | Implementation (full file + bash)            |
| Agent    | scribe              | Documentation (write, no bash)               |
| Agent    | reviewer            | Code review (read-only + git)                |
| Command  | review              | `/review` slash command                      |
| Bundle   | philosophy          | Code + frontend philosophy skills            |
| MCP      | context7            | Library documentation lookup                 |
| MCP      | exa                 | Web search for external research             |
| MCP      | gh_grep             | GitHub code search                           |

## Permissions

The bundle configures security boundaries:

| Scope      | Setting                                                  |
| ---------- | -------------------------------------------------------- |
| Global     | `webfetch: deny` — no direct web fetching                |
| plan       | Read-only orchestrator, delegates via `task` tool        |
| build      | Read-only orchestrator, delegates via `task` tool        |
| explore    | Read-only specialist, filesystem + git inspection only   |
| researcher | Read-only, MCP tools only (Context7, Exa, GitHub Grep)   |
| coder      | Full file + bash access                                  |
| scribe     | File write only, no bash                                 |
| reviewer   | Read-only + git inspection                               |

## Installation

### 1. Install OCX

See the [OCX repository](https://github.com/kdcokenny/ocx) for installation instructions.

### 2. Add the KDCO Registry

```bash
ocx registry add https://registry.kdco.dev --name kdco
```

> **Tip:** Add `--global` to configure the registry globally instead of per-project.

### 3. Install the Bundle

```bash
ocx add kdco/workspace
```

## Owning Your Code

Every file in this bundle is synced to this repository. Fork it, modify the agents, tune the skills, make it yours. That's the point of OCX.

## Disclaimer

This project is not built by the OpenCode team and is not affiliated with [OpenCode](https://github.com/sst/opencode) in any way.

## License

MIT
