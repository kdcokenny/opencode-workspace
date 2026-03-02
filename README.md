# opencode-workspace

A fork of [kdcokenny/opencode-workspace](https://github.com/kdcokenny/opencode-workspace) with additional skills and Atlassian integration.

## Installation

### Registry Installation

Add the registry to install components from it:

```bash
# Latest (main branch)
ocx registry add https://thompsonsed.github.io/opencode-workspace --name thompsonsed --global

# Specific version (pinned)
ocx registry add https://thompsonsed.github.io/opencode-workspace/v1.0.0 --name thompsonsed-v1 --global
```

### Profile Installation

Once the registry is added, install the `ws` profile:

```bash
# Install ws profile from registry
ocx profile add thompsonsed/ws

# Or with explicit naming
ocx profile add my-workspace --source thompsonsed/ws --global
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
ocx profile add thompsonsed/ws

# Use the profile
ocx oc -p ws
```

## What's Included

| Category | Count | Components |
|----------|-------|------------|
| Agents | 4 | coder, researcher, reviewer, scribe |
| Plugins | 5 | background-agents, workspace-plugin, worktree, notify, kdco-primitives |
| Skills | 8 | code-philosophy, code-review, frontend-philosophy, plan-review, plan-protocol, atlassian, github-cli, python-uv |
| Commands | 1 | /review |

### Profile: ws

The `ws` profile bundles all components with pre-configured settings:
- **Agents**: coder, researcher, reviewer, scribe (with explore for codebase analysis)
- **Models**: GitHub Copilot models (claude-opus-4.5, claude-sonnet-4.5, claude-haiku-4.5)
- **Plugins**: Background delegation, plan management, git worktree isolation, notifications
- **Skills**: Code philosophy, code review, frontend philosophy, planning protocols
- **MCP Servers**: Atlassian, Context7, Exa, GitHub grep

## Fork Additions

This fork extends upstream with:

| Addition | Description |
|----------|-------------|
| **Atlassian MCP** | Jira and Confluence integration via OAuth |
| **GitHub CLI skill** | `gh` operations for PRs, issues, releases |
| **Plan protocol skill** | Implementation planning with citations |
| **Python uv skill** | Python tooling via uv package manager |
| **GitHub Copilot models** | claude-sonnet-4, claude-opus-4.5, o4-mini, gpt-4.1 |

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

## License

MIT
