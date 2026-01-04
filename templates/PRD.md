---
id: REQ-XXX
title: "Feature Title"
type: feature          # feature | bugfix | refactor
status: draft          # draft | approved | implemented | verified
priority: high         # high | medium | low
created: 2026-01-04
updated: 2026-01-04
context:               # VSA scope - restricts agent's vision
  - src/features/*
tools:                 # MCP tools permitted for this PRD
  - git
  - playwright
handoff:               # Next agent after completion
  target: test-agent
  prompt: "Generate Gherkin tests for this feature"
---

# Feature Title

## Summary

One-sentence description of what this feature does and why it matters.

---

## User Stories

> These are parsed by the **Test Agent** to generate Gherkin `.feature` files.

### US-001: [Story Title]

**As a** [user type],  
**I want** [goal],  
**So that** [benefit].

**Acceptance Criteria:**
- [ ] Given [precondition], When [action], Then [result]
- [ ] Given [precondition], When [action], Then [result]

---

## Data Models

> These are parsed by the **Architect Agent** to generate TypeScript interfaces and SQL schemas.

### [Model Name]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| name | string | Yes | Display name |
| createdAt | DateTime | Yes | Timestamp |

---

## API Endpoints

> These are parsed by the **Backend Agent** to generate route handlers.

### `POST /api/[resource]`

**Description:** Create a new [resource].

**Request Body:**
```json
{
  "name": "string"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "string",
  "createdAt": "datetime"
}
```

**Errors:**
- `400` - Invalid request body
- `401` - Unauthorized

---

## UI Design

> These are parsed by the **Frontend Agent** to generate React/Vue components.

### [Component Name]

**Location:** `src/features/[feature]/[component].tsx`

**Props:**
- `data: [Type]` - Data to display
- `onSubmit: () => void` - Form submission handler

**Behavior:**
- Shows loading state while fetching
- Displays error toast on failure
- Redirects to [path] on success

---

## Non-Functional Requirements

> These are parsed by the **DevOps Agent** for infrastructure and testing.

### Performance
- Page load < 2 seconds
- API response < 200ms

### Security
- All endpoints require authentication
- Rate limiting: 100 requests/minute

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigable

---

## Implementation Notes

Any additional context, edge cases, or technical constraints the agent should know.

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-04 | [Name] | Initial draft |
