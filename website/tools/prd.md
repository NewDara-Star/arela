# arela_prd

Manage Product Requirement Documents (PRDs) - the "source code" of your application.

## Overview

PRDs are structured Markdown files with YAML frontmatter that define features, user stories, and specifications. In the Natural Language Programming paradigm, PRDs function as the Abstract Syntax Tree (AST) from which code is generated.

**Note:** JSON PRDs are supported. Use `parse-json`, `json-features`, or `json-feature` with `spec/prd.json` (or another JSON path). Markdown PRDs under `prds/` are still supported.

## Actions

### `list`

Find all PRD files in the project.

```json
{
  "action": "list"
}
```

### `parse`

Parse a PRD file and extract its structure.

```json
{
  "action": "parse",
  "path": "prds/login.prd.md"
}
```

**Returns:** Frontmatter fields, sections with line numbers.

### `status`

Get the current status and metadata of a PRD.

```json
{
  "action": "status",
  "path": "prds/login.prd.md"
}
```

### `create`

Create a new PRD from template.

```json
{
  "action": "create",
  "id": "REQ-001",
  "title": "User Authentication",
  "type": "feature",
  "outputPath": "prds/auth.prd.md"
}
```

### `stories`

Extract user stories from a PRD.

```json
{
  "action": "stories",
  "path": "prds/login.prd.md"
}
```

**Returns:** Parsed user stories with As a/I want/So that structure.

### `update-status`

Update the status of a PRD.

```json
{
  "action": "update-status",
  "path": "prds/login.prd.md",
  "newStatus": "approved"
}
```

### `parse-json`

Parse a JSON PRD (e.g., `spec/prd.json`).

```json
{
  "action": "parse-json",
  "path": "spec/prd.json"
}
```

### `json-features`

List features from a JSON PRD.

```json
{
  "action": "json-features",
  "path": "spec/prd.json"
}
```

### `json-feature`

Get a single feature from a JSON PRD by ID.

```json
{
  "action": "json-feature",
  "path": "spec/prd.json",
  "featureId": "FEAT-001"
}
```

## Frontmatter Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique requirement ID (e.g., REQ-001) |
| `title` | string | Human-readable title |
| `type` | enum | `feature` \| `bugfix` \| `refactor` |
| `status` | enum | `draft` \| `approved` \| `implemented` \| `verified` |
| `priority` | enum | `high` \| `medium` \| `low` |
| `context` | string[] | VSA scope paths (restricts agent vision) |
| `tools` | string[] | Permitted MCP tools for this PRD |
| `handoff` | object | Next agent configuration |

## Example PRD

```markdown
---
id: REQ-001
title: "User Login"
type: feature
status: draft
priority: high
context:
  - src/features/login/*
tools:
  - playwright
  - git
---

# User Login

## User Stories

### US-001: Basic Login

**As a** registered user,  
**I want** to log in with email and password,  
**So that** I can access my account.

**Acceptance Criteria:**
- [ ] Given valid credentials, When I submit, Then I see dashboard
- [ ] Given invalid credentials, When I submit, Then I see error
```

## Related Tools

- (No MCP translate tool exposed yet) Use PRD files directly or external drafting tools.
- [`arela_verify`](./verify.md) - Verify PRD claims against codebase
- [`arela_graph_impact`](./graph-impact.md) - Check PRD context dependencies
