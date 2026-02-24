---
name: atlassian
description: Atlassian MCP tools - use for all Jira, Confluence, and Compass operations via the Atlassian MCP server
---

# Atlassian MCP Integration

**Rule:** For ALL Atlassian-related operations (Jira, Confluence, Compass), use the Atlassian MCP server tools.

## Core Principles

1. **MCP tools are available** - The Atlassian MCP server provides direct access to Jira, Confluence, and Compass
2. **Authentication is handled** - OAuth 2.1 handles auth automatically via browser flow
3. **User's instance** - `relationrx.atlassian.net`
4. **Use the right tool** for each operation (see tool reference below)

## Available Tools

### Jira Tools
| Tool | Description |
|------|-------------|
| `createJiraIssue` | Create a new Jira issue |
| `editJiraIssue` | Update an existing issue |
| `getJiraIssue` | Get details of a specific issue |
| `searchJiraIssuesUsingJql` | Search issues using JQL |
| `addCommentToJiraIssue` | Add a comment to an issue |
| `addWorklogToJiraIssue` | Log work on an issue |
| `getTransitionsForJiraIssue` | Get available status transitions |
| `transitionJiraIssue` | Change issue status |
| `getVisibleJiraProjects` | List accessible projects |
| `getJiraIssueTypeMetaWithFields` | Get issue type metadata |
| `getJiraProjectIssueTypesMetadata` | Get project issue types |
| `getJiraIssueRemoteIssueLinks` | Get remote links on an issue |
| `lookupJiraAccountId` | Look up a user's account ID |

### Confluence Tools
| Tool | Description |
|------|-------------|
| `createConfluencePage` | Create a new page |
| `updateConfluencePage` | Update an existing page |
| `getConfluencePage` | Get page content |
| `getConfluenceSpaces` | List available spaces |
| `getPagesInConfluenceSpace` | List pages in a space |
| `searchConfluenceUsingCql` | Search using CQL |
| `getConfluencePageDescendants` | Get child pages |
| `createConfluenceFooterComment` | Add a footer comment |
| `createConfluenceInlineComment` | Add an inline comment |
| `getConfluencePageFooterComments` | Get footer comments |
| `getConfluencePageInlineComments` | Get inline comments |

### Compass Tools (OAuth only)
| Tool | Description |
|------|-------------|
| `createCompassComponent` | Create a service component |
| `getCompassComponent` | Get component details |
| `getCompassComponents` | List components |
| `deleteCompassComponent` | Delete a component |
| `createCompassComponentRelationship` | Link components |
| `deleteCompassComponentRelationship` | Remove component link |
| `getCompassComponentLabels` | Get component labels |
| `getCompassComponentTypes` | Get available component types |
| `getCompassComponentActivityEvents` | Get component activity |
| `createCompassCustomFieldDefinition` | Create custom field |
| `deleteCompassCustomFieldDefinition` | Delete custom field |
| `getCompassCustomFieldDefinitions` | List custom fields |
| `getCompassComponentsOwnedByMyTeams` | Get my team's components |

### Rovo/Platform Tools
| Tool | Description |
|------|-------------|
| `search` | Natural language search across Jira and Confluence |
| `fetch` | Fetch content by Atlassian Resource Identifier (ARI) |
| `atlassianUserInfo` | Get current user account details |
| `getAccessibleAtlassianResources` | List accessible cloud sites |

## Common Operations

### List My Jira Issues
```
Use searchJiraIssuesUsingJql with JQL: "assignee = currentUser() ORDER BY updated DESC"
```

### Find Open Bugs in a Project
```
Use searchJiraIssuesUsingJql with JQL: "project = PROJ AND type = Bug AND status != Done"
```

### Create a Jira Issue
```
Use createJiraIssue with:
- projectKey: The project key (e.g., "PROJ")
- issueType: "Task", "Bug", "Story", etc.
- summary: Issue title
- description: Issue details (optional)
```

### Search Confluence
```
Use searchConfluenceUsingCql with CQL: "type = page AND text ~ 'search term'"
Or use the `search` tool for natural language queries
```

### Get Page Content
```
Use getConfluencePage with the page ID or title
```

## JQL Quick Reference

```jql
# My open issues
assignee = currentUser() AND status != Done

# Recent issues in a project
project = PROJ ORDER BY created DESC

# Issues updated this week
updated >= -1w

# High priority bugs
priority = High AND type = Bug

# Issues with specific label
labels = "needs-review"

# Sprint issues
sprint in openSprints()
```

## CQL Quick Reference (Confluence)

```cql
# Search page content
type = page AND text ~ "search term"

# Pages in a space
space = SPACE AND type = page

# Recently modified
lastModified > now("-7d")

# Pages by creator
creator = currentUser()
```

## DO THIS / NOT THIS

### Searching Jira
```
# DO THIS - use the MCP tool
searchJiraIssuesUsingJql with JQL query

# NOT THIS - manual API calls
curl -H "Authorization: ..." https://relationrx.atlassian.net/rest/api/...
```

### Creating Issues
```
# DO THIS - use the MCP tool
createJiraIssue with project, type, summary

# NOT THIS - manual API calls or external scripts
```

## Troubleshooting

### "No access" or "Not authenticated"
- The OAuth flow may not have completed
- Try a simple operation to trigger the auth flow
- Check that the MCP server is enabled in OpenCode config

### "Permission denied"
- User may not have access to that project/space
- Check Jira/Confluence permissions in Atlassian admin

### Tool not found
- Ensure the `atlassian` MCP server is configured in opencode.jsonc
- Restart OpenCode after config changes
