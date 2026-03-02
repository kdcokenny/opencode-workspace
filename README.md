# opencode-workspace

A fork of [kdcokenny/opencode-workspace](https://github.com/kdcokenny/opencode-workspace) with additional skills and Atlassian integration.

## Installation

```bash
# Add this registry (GitHub Pages - recommended)
ocx registry add https://thompsonsed.github.io/opencode-workspace --name thompsonsed --global

# Or use the latest release (for testing new features)
ocx registry add https://github.com/thompsonsed/opencode-workspace/releases/latest/download/registry.zip --name thompsonsed-dev --global

# Install the profile
ocx profile add ws --from thompsonsed/ws

# Use it
ocx oc -p ws
```

## Installation Methods

There are three ways to install this registry:

### GitHub Pages (Recommended)

The most stable option. GitHub Pages hosts a built version of the registry that updates automatically when changes are pushed to main.

```bash
ocx registry add https://thompsonsed.github.io/opencode-workspace --name thompsonsed --global
```

### Latest Release

For testing the most recent development features. Releases are published periodically and include pre-built registry files.

```bash
ocx registry add https://github.com/thompsonsed/opencode-workspace/releases/latest/download/registry.zip --name thompsonsed-dev --global
```

### Local/Development

For testing from a local checkout. Clone the repository and point to the local path.

```bash
git clone https://github.com/thompsonsed/opencode-workspace.git
cd opencode-workspace
ocx registry add . --name thompsonsed-local --global
```

## What's Included

| Category | Count | Components |
|----------|-------|------------|
| Agents | 4 | coder, researcher, reviewer, scribe |
| Plugins | 5 | background-agents, workspace-plugin, worktree, notify, kdco-primitives |
| Skills | 8 | code-philosophy, code-review, frontend-philosophy, plan-review, plan-protocol, atlassian, github-cli, python-uv |
| Commands | 1 | /review |

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

This registry supports two distribution methods:

### GitHub Pages (Automatic)

The easiest option. The registry auto-deploys to GitHub Pages via Actions.

1. Fork this repository
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Push to main - the workflow builds and deploys automatically

Registry URL: `https://<username>.github.io/<repo-name>`

### Release-Based Distribution

Releases provide versioned, downloadable registry bundles. This is useful for pinning to specific versions or hosting outside GitHub Pages.

1. Create a new release (via GitHub UI or `gh release create`)
2. The workflow automatically builds and attaches `registry.zip` to the release
3. Users can install from your releases:

```bash
ocx registry add https://github.com/<username>/<repo>/releases/latest/download/registry.zip --name <registry-name> --global
```

To pin to a specific version:

```bash
ocx registry add https://github.com/<username>/<repo>/releases/download/v1.0.0/registry.zip --name <registry-name> --global
```

## License

MIT
