# opencode-workspace

A fork of [kdcokenny/opencode-workspace](https://github.com/kdcokenny/opencode-workspace) with additional skills and Atlassian integration.

## Installation

```bash
# Add this registry
ocx registry add https://thompsonsed.github.io/opencode-workspace --name thompsonsed --global

# Install the profile
ocx profile add ws --from thompsonsed/ws

# Use it
ocx oc -p ws
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

This registry auto-deploys to GitHub Pages via Actions. To fork and host your own:

1. Fork this repository
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Push to main - the workflow builds and deploys automatically

Registry URL: `https://<username>.github.io/<repo-name>`

## Versioned Releases

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

## License

MIT
