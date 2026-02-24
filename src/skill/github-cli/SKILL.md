---
name: github-cli
description: GitHub CLI (gh) - use gh for all GitHub operations (PRs, issues, releases, API calls, etc.)
---

# GitHub CLI (gh)

**Rule:** For ALL GitHub-related operations, use `gh` as the primary tool.

## Core Principles

1. **Always use gh** for interacting with GitHub repositories, PRs, issues, and releases
2. **Use gh api** for raw API access instead of curl with tokens
3. **Leverage JSON output** for scriptable, parseable results
4. **Authentication is handled** - no manual token management needed

## Common Commands

### Repository Operations
```bash
# View repository info
gh repo view
gh repo view owner/repo
gh repo view --json name,description,url

# Clone a repository
gh repo clone owner/repo
gh repo clone owner/repo -- --depth 1

# Create a repository
gh repo create my-repo --public
gh repo create my-repo --private --source=. --remote=origin
```

### Pull Requests
```bash
# Create a PR
gh pr create --title "Add feature" --body "Description"
gh pr create --fill  # Use commit info for title/body
gh pr create --draft

# View PR details
gh pr view 123
gh pr view 123 --json state,reviews,checks
gh pr view --web  # Open in browser

# List PRs
gh pr list
gh pr list --state=open --author=@me
gh pr list --json number,title,state

# Checkout a PR locally
gh pr checkout 123

# Merge a PR
gh pr merge 123
gh pr merge 123 --squash
gh pr merge 123 --rebase --delete-branch

# Review a PR
gh pr review 123 --approve
gh pr review 123 --request-changes --body "Please fix X"
```

### Issues
```bash
# Create an issue
gh issue create --title "Bug report" --body "Details"
gh issue create --label bug --assignee @me

# View issue details
gh issue view 456
gh issue view 456 --json state,labels,assignees

# List issues
gh issue list
gh issue list --state=open --label=bug
gh issue list --assignee=@me

# Close an issue
gh issue close 456
gh issue close 456 --comment "Fixed in #123"
```

### Releases
```bash
# Create a release
gh release create v1.0.0
gh release create v1.0.0 --generate-notes
gh release create v1.0.0 ./dist/*.tar.gz --title "Release v1.0.0"

# View release details
gh release view v1.0.0
gh release view --json tagName,body,assets

# List releases
gh release list
gh release list --limit 5

# Download release assets
gh release download v1.0.0
gh release download v1.0.0 --pattern "*.tar.gz"
```

### Workflow/Actions
```bash
# List workflow runs
gh run list
gh run list --workflow=ci.yml
gh run list --status=failure

# View a specific run
gh run view 12345
gh run view 12345 --log
gh run view 12345 --json status,conclusion

# Watch a run in progress
gh run watch 12345

# Trigger a workflow
gh workflow run ci.yml
gh workflow run deploy.yml --ref main -f environment=production

# List workflows
gh workflow list
gh workflow view ci.yml
```

### Code Search
```bash
# Search code
gh search code "function validateEmail" --repo owner/repo
gh search code "TODO" --language=typescript

# Search repositories
gh search repos "cli tool" --language=go
gh search repos "org:myorg topic:api"

# Search issues/PRs
gh search issues "bug" --state=open --repo owner/repo
gh search prs "WIP" --author=@me
```

### API Access
```bash
# DO THIS - use gh api
gh api repos/owner/repo
gh api repos/owner/repo/pulls/123
gh api repos/owner/repo/issues --method POST --field title="New issue" --field body="Details"

# Get JSON and parse with jq
gh api repos/owner/repo --jq '.stargazers_count'
gh api repos/owner/repo/contributors --jq '.[].login'

# Paginate results
gh api repos/owner/repo/issues --paginate

# NOT THIS - manual curl with tokens
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/owner/repo
```

### PR Comments
```bash
# View PR comments
gh api repos/owner/repo/pulls/123/comments
gh api repos/owner/repo/issues/123/comments  # For issue-style comments on PR

# Add a comment
gh pr comment 123 --body "LGTM!"
gh issue comment 456 --body "Thanks for reporting"
```

## Why gh?

- **Authentication Handled:** Uses your GitHub credentials automatically
- **JSON Output:** Add `--json` to any command for scriptable output
- **Consistent Interface:** Same patterns across all GitHub operations
- **No Token Management:** No need to create/store/rotate PATs for CLI usage
- **Rich Formatting:** Human-readable output by default, JSON when needed
- **GitHub Actions Integration:** First-class support for workflow operations

## DO THIS / NOT THIS

### Viewing PR Details
```bash
# DO THIS
gh pr view 123
gh api repos/owner/repo/pulls/123

# NOT THIS
curl -H "Authorization: token $TOKEN" https://api.github.com/repos/owner/repo/pulls/123
```

### Creating Issues
```bash
# DO THIS
gh issue create --title "Bug" --body "Description"

# NOT THIS
curl -X POST -H "Authorization: token $TOKEN" \
  -d '{"title":"Bug","body":"Description"}' \
  https://api.github.com/repos/owner/repo/issues
```

### Checking CI Status
```bash
# DO THIS
gh pr checks 123
gh run list --commit HEAD

# NOT THIS
curl -H "Authorization: token $TOKEN" \
  https://api.github.com/repos/owner/repo/commits/SHA/check-runs
```

## Verification Checklist

Before running any GitHub command, ask:
- [ ] Am I using `gh` instead of curl with tokens?
- [ ] Am I using `gh api` for raw API calls?
- [ ] Am I using `--json` for scriptable output when needed?
- [ ] Am I using `gh pr`/`gh issue` instead of manual API calls?
- [ ] Am I leveraging `--jq` for JSON parsing instead of piping to jq?

## Exception

Only use raw API calls with curl/tokens if:
- Working in an environment without gh installed
- Explicitly instructed to bypass gh for a specific reason
- Debugging authentication issues with gh itself
