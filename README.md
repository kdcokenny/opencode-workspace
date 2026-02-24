# opencode-workspace

Bundled multi-agent orchestration harness for OpenCode. One install, complete control.

> **This is a fork** of [kdcokenny/opencode-workspace](https://github.com/kdcokenny/opencode-workspace) with additional customizations. See [Fork Customizations](#fork-customizations) for details.

## Quick Start (Original Registry)

```bash
# One-time setup
ocx init --global

# Install the KDCO workspace profile (OpenCode Free Models Only)
ocx profile add ws --source tweak/p-1vp4xoqv --from https://tweakoc.com/r --global

# Launch
ocx oc -p ws
```

Need a custom profile? Open the KDCO Workspace harness in TweakOC: https://tweakoc.com/h/kdco-workspace

See the [full installation guide](../../docs/guides/kdco-workspace.mdx) for more customization options.

## Installation from This Fork

If you want the fork-specific customizations (Atlassian MCP, GitHub Copilot models, additional skills):

```bash
# Clone directly
git clone git@github.com:thompsonsed/opencode-workspace.git ~/.config/opencode/profiles/ws

# Or if using OCX, add as local profile
ocx profile add ws --path ~/.config/opencode/profiles/ws
```

### Per-Machine Setup

After installation, some integrations require one-time setup:

| Integration | Setup Required |
|-------------|----------------|
| **Atlassian MCP** | First use of `atlassian_*` tools will trigger OAuth login |
| **GitHub CLI** | Ensure `gh auth login` is completed |
| **Copilot Models** | Requires active GitHub Copilot subscription |

### Syncing with Upstream

To pull in updates from the original repository:

```bash
cd ~/.config/opencode/profiles/ws
git remote add upstream git@github.com:kdcokenny/opencode-workspace.git  # one-time
git fetch upstream
git merge upstream/main
```

## Fork Customizations

This fork extends the upstream with:

| Category | Addition | Description |
|----------|----------|-------------|
| Skill | `atlassian` | Atlassian MCP tools for Jira, Confluence, and Compass |
| Skill | `github-cli` | GitHub CLI (gh) operations for PRs, issues, releases |
| Skill | `plan-protocol` | Implementation planning with citations |
| Skill | `python-uv` | Python tooling via uv package manager |
| MCP | Atlassian | OAuth-based Jira/Confluence integration |
| Models | GitHub Copilot | claude-sonnet-4, claude-opus-4.5, o4-mini, gpt-4.1 |

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

## Advanced: Direct Install (No Profile)

```bash
ocx add kdco/workspace --from https://registry.kdco.dev
```

If you don't have OCX installed, install it from the [OCX repository](https://github.com/kdcokenny/ocx).

## Owning Your Code

Every file in this bundle is synced to this repository. Fork it, modify the agents, tune the skills, make it yours. That's the point of OCX.

## Disclaimer

This project is not built by the OpenCode team and is not affiliated with [OpenCode](https://github.com/sst/opencode) in any way.

## License

MIT
