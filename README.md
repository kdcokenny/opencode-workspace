# opencode-workspace

A fork of [kdcokenny/opencode-workspace](https://github.com/kdcokenny/opencode-workspace) with additional skills and Atlassian integration.

Bundled multi-agent orchestration harness for OpenCode. One install, complete control.

## Installation

### Registry Installation

Add the registry to install components from it:

```bash
# Latest (main branch)
ocx registry add https://thompsonsed.github.io/opencode-workspace --name thompsonsed --global

# Specific version (pinned)
ocx registry add https://thompsonsed.github.io/opencode-workspace/v2.0.0 --name thompsonsed-v1 --global
```

### Profile Installation

Once the registry is added, install the `ws` profile:

```bash
# Install ws profile from registry
ocx profile add ws --from thompsonsed/ws --global
```

### Direct Profile Download (Alternative)

Download a specific version directly from releases without adding the registry:

```bash
# Download and extract ws profile from a specific release
curl -L https://github.com/thompsonsed/opencode-workspace/releases/download/v1.0.0/ws-profile-v1.0.0.tar.gz | tar -xz -C ~/.config/opencode/profiles/ws
```

### Quick Start

```bash
# Add registry and install profile in one session
ocx registry add https://thompsonsed.github.io/opencode-workspace --name thompsonsed --global
ocx profile add ws --from thompsonsed/ws --global

# Use the profile
ocx oc -p ws
```

## What This Is

A **bundle** — a curated collection of components that work together as a complete AI development harness. Installing `kdco/workspace` gives you:

- 4 plugins (delegation, planning, notifications, worktrees)
- 2 npm plugins (DCP, markdown table formatter)
- 5 MCP servers (Context7, Exa, GitHub Grep, Atlassian, OpenTargets)
- 4 agents (researcher, coder, scribe, reviewer)
- 20 skills (8 development + 12 scientific research skills)
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
| Skill    | plan-review         | Implementation plan review criteria          |
| Skill    | code-review         | Review methodology + severity classification |
| Skill    | code-philosophy     | Internal logic philosophy (5 Laws)           |
| Skill    | frontend-philosophy | Visual/UI philosophy (5 Pillars)             |
| Skill    | atlassian           | Atlassian MCP for Jira/Confluence            |
| Skill    | github-cli          | GitHub CLI (gh) operations                   |
| Skill    | python-uv           | Python tooling with uv                       |
| Skill    | scanpy              | Single-cell RNA-seq analysis                 |
| Skill    | scvelo              | RNA velocity analysis                        |
| Skill    | scvi-tools          | Deep generative models for single-cell       |
| Skill    | anndata             | AnnData data structure                       |
| Skill    | cellxgene-census    | Query CELLxGENE Census (61M+ cells)          |
| Skill    | pydeseq2            | Differential gene expression                 |
| Skill    | database-lookup     | Search 78+ public scientific databases       |
| Skill    | gget                | Fast queries to 20+ bioinformatics DBs       |
| Skill    | bioservices         | Unified interface to 40+ bio services        |
| Skill    | rdkit               | Cheminformatics molecular toolkit            |
| Skill    | datamol             | Pythonic RDKit wrapper                       |
| Skill    | deepchem            | Deep learning for chemistry                  |
| MCP      | opentargets         | Target-disease associations (78K+ targets)   |
| Agent    | researcher          | External research (MCP tools, read-only)     |
| Agent    | coder               | Implementation (full file + bash)            |
| Agent    | scribe              | Documentation (write, no bash)               |
| Agent    | reviewer            | Code review (read-only + git)                |
| Command  | review              | `/review` slash command                      |
| Bundle   | philosophy          | Code + frontend philosophy skills            |
| MCP      | context7            | Library documentation lookup                 |
| MCP      | exa                 | Web search for external research             |
| MCP      | gh_grep             | GitHub code search                           |
| MCP      | atlassian           | Jira and Confluence via OAuth                |

## Permissions

The bundle configures security boundaries:

| Scope      | Setting                                                  |
| ---------- | -------------------------------------------------------- |
| Global     | `webfetch: deny` — no direct web fetching                |
| plan       | Read-only orchestrator, delegates via `task` tool        |
| build      | Read-only orchestrator, delegates via `task` tool        |
| explore    | Read-only specialist, filesystem + git inspection only   |
| researcher | Read-only, MCP tools (Context7, Exa, GitHub Grep, Atlassian, OpenTargets) |
| coder      | Full file + bash access                                  |
| scribe     | File write only, no bash                                 |
| reviewer   | Read-only + git inspection                               |

## What's Included

| Category | Count | Components |
|----------|-------|------------|
| Agents | 4 | coder, researcher, reviewer, scribe |
| Plugins | 5 | background-agents, workspace-plugin, worktree, notify, kdco-primitives |
| Skills | 20 | 8 development skills + 12 scientific research skills |
| MCPs | 5 | context7, exa, gh_grep, atlassian, opentargets |
| Commands | 1 | /review |

### Profile: ws

The `ws` profile bundles all components with pre-configured settings:
- **Agents**: coder, researcher, reviewer, scribe (with explore for codebase analysis)
- **Models**: GitHub Copilot models (claude-opus-4.6, claude-sonnet-4.6, claude-haiku-4.6)
- **Plugins**: Background delegation, plan management, git worktree isolation, notifications
- **Skills**: 8 development skills (code-philosophy, code-review, frontend-philosophy, plan-protocol, plan-review, atlassian, github-cli, python-uv) + 12 scientific skills (scanpy, scvelo, scvi-tools, anndata, cellxgene-census, pydeseq2, database-lookup, gget, bioservices, rdkit, datamol, deepchem)
- **MCP Servers**: Atlassian, Context7, Exa, GitHub grep, OpenTargets

## Fork Additions

This fork extends upstream with:

| Addition | Description |
|----------|-------------|
| **Atlassian MCP** | Jira and Confluence integration via OAuth |
| **GitHub CLI skill** | `gh` operations for PRs, issues, releases |
| **Plan protocol skill** | Implementation planning with citations |
| **Python uv skill** | Python tooling via uv package manager |
| **OpenTargets MCP** | Target-disease associations for drug discovery |
| **Scientific skills (12)** | Single-cell omics, database access, cheminformatics |
| **GitHub Copilot models** | claude-opus-4.6, claude-sonnet-4.6, claude-haiku-4.6 |

## Per-Machine Setup

Some integrations require one-time setup:

| Integration | Setup |
|-------------|-------|
| **Atlassian** | First use of `atlassian_*` tools triggers OAuth login |
| **GitHub CLI** | Run `gh auth login` |
| **Models** | Requires active GitHub Copilot subscription |

## Syncing with Upstream

```bash
git fetch upstream
git merge upstream/main
```

If you haven't added the upstream remote:

```bash
git remote add upstream git@github.com:kdcokenny/opencode-workspace.git
```

## Self-Hosting

This registry supports versioned distribution via GitHub Pages:

### GitHub Pages (Automatic)

The registry auto-deploys to GitHub Pages via Actions:

1. Fork this repository
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Push to main - the workflow builds and deploys automatically

**Registry URLs:**
- Latest: `https://<username>.github.io/<repo-name>`
- Versioned: `https://<username>.github.io/<repo-name>/v1.0.0`

### Creating Releases

Releases create versioned snapshots:

1. Create a new release (via GitHub UI or `gh release create v1.0.0`)
2. The workflow automatically:
   - Deploys to `/v1.0.0/` subdirectory on GitHub Pages
   - Creates `ws-profile-v1.0.0.tar.gz` and uploads it to the release
   - Cleans up old versions (keeps last 5)

### Versioned Releases

Each release creates:
- A versioned deployment at `/vX.X.X/` on GitHub Pages
- A profile tarball attached as a release asset
- Automatic cleanup keeps the 5 most recent versions

To install a specific version:

```bash
# Download release asset
gh release download v1.0.0 -A tar.gz

# Or use the versioned URL
https://thompsonsed.github.io/opencode-workspace/v1.0.0/
```

### Version Cleanup

The workflow automatically maintains only the last 5 version directories on GitHub Pages. Older versions are removed during each release deployment to keep storage usage low.

## Contributing

This facade is maintained from the main [OCX monorepo](https://github.com/kdcokenny/ocx).

If you want to update opencode-workspace itself, start here:

- https://github.com/kdcokenny/ocx/blob/main/workers/kdco-registry/files/plugins/workspace-plugin.ts
- https://github.com/kdcokenny/ocx/tree/main/workers/kdco-registry/files

- Open issues here: https://github.com/kdcokenny/ocx/issues/new
- Open pull requests here: https://github.com/kdcokenny/ocx/compare
- Please do **not** open issues or PRs in this facade repository.

## Disclaimer

This is a fork with additional customizations. For the original upstream, see [kdcokenny/opencode-workspace](https://github.com/kdcokenny/opencode-workspace).

## License

MIT
