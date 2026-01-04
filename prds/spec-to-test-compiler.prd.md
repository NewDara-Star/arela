---
id: REQ-002
title: "Spec-to-Test Compiler"
type: feature
status: verified
priority: high
created: 2026-01-04
updated: 2026-01-04
context:
  - slices/test/*
  - slices/prd/*
tools:
  - playwright
  - git
handoff:
  target: coder-agent
  prompt: "Implement the test generation logic based on these specs"
---

# Spec-to-Test Compiler

## Summary

Automatically generate Gherkin `.feature` files and Playwright test stubs from PRD User Stories. This bridges the gap between human-readable specifications and executable tests, enabling the "BDD as Compiler Check" workflow from the PhD vision.

---

## User Stories

### US-001: Generate Gherkin from User Stories

**As a** developer using Arela,  
**I want** to generate Gherkin feature files from PRD user stories,  
**So that** I can verify my code matches the specification before writing it.

**Acceptance Criteria:**
- [ ] Given a PRD with user stories, When I call `arela_test_generate`, Then Gherkin `.feature` files are created
- [ ] Given user story acceptance criteria in Given/When/Then format, When generated, Then they map directly to Gherkin scenarios
- [ ] Given a user story without proper format, When generated, Then the AI infers reasonable scenarios

### US-002: Generate Playwright Step Definitions

**As a** developer using Arela,  
**I want** to generate Playwright step definition stubs from Gherkin files,  
**So that** I have executable test skeletons ready to run.

**Acceptance Criteria:**
- [ ] Given a `.feature` file, When I call `arela_test_generate` with stepDefs option, Then TypeScript step definitions are created
- [ ] Given step definitions are generated, When I run Playwright, Then tests execute (may fail, but run)
- [ ] Given accessibility locators exist, When generated, Then tests use `getByRole` over CSS selectors

### US-003: Watch Mode for Continuous Testing

**As a** developer using Arela,  
**I want** tests to auto-run when PRD or code changes,  
**So that** I get immediate feedback on whether my code matches the spec.

**Acceptance Criteria:**
- [ ] Given watch mode is enabled, When PRD user stories change, Then affected tests regenerate
- [ ] Given watch mode is enabled, When code changes, Then affected tests run automatically
- [ ] Given a test fails, When in watch mode, Then notification is shown

---

## Data Models

### GeneratedTest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prdId | string | Yes | Source PRD ID (e.g., REQ-002) |
| storyId | string | Yes | Source user story ID (e.g., US-001) |
| featurePath | string | Yes | Path to generated `.feature` file |
| stepDefPath | string | Yes | Path to generated step definitions |
| generatedAt | DateTime | Yes | When the test was generated |

### TestGenerationConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| outputDir | string | No | Directory for generated tests (default: `tests/`) |
| selectorStrategy | enum | No | `a11y` \| `testid` \| `css` (default: `a11y`) |
| framework | enum | No | `playwright` \| `cypress` (default: `playwright`) |

---

## API Endpoints

> These are MCP tool definitions, not HTTP endpoints.

### `arela_test_generate`

**Description:** Generate tests from a PRD.

**Input Schema:**
```json
{
  "prdPath": "prds/spec-to-test.prd.md",
  "outputDir": "tests/",
  "generateStepDefs": true,
  "selectorStrategy": "a11y"
}
```

**Output:**
```json
{
  "generated": [
    {
      "storyId": "US-001",
      "featurePath": "tests/features/US-001.feature",
      "stepDefPath": "tests/steps/US-001.steps.ts"
    }
  ]
}
```

### `arela_test_run`

**Description:** Run generated tests for a PRD.

**Input Schema:**
```json
{
  "prdPath": "prds/spec-to-test.prd.md",
  "watch": false
}
```

---

## UI Design

> No UI components for this feature - it's a backend/MCP tool.

---

## Non-Functional Requirements

### Performance
- Test generation < 5 seconds per user story
- Test execution feedback < 30 seconds

### Reliability
- Generated tests must be syntactically valid (parseable by Playwright/Cucumber)
- Idempotent: re-running generation produces same output for same input

### Extensibility
- Support for future frameworks (Cypress, Jest)
- Pluggable selector strategies

---

## Implementation Notes

### Dependencies to Add
- `@cucumber/cucumber` - Gherkin parsing and execution
- `playwright-bdd` or similar - BDD integration with Playwright

### Key Files to Create
- `slices/test/README.md` - Slice documentation
- `slices/test/types.ts` - TypeScript types for test generation
- `slices/test/generator.ts` - Gherkin + step definition generation
- `slices/test/runner.ts` - Test execution wrapper
- `slices/test/ops.ts` - MCP tool operations

### LLM Usage
- Use OpenAI `gpt-4o-mini` for inferring Gherkin scenarios from loose user story text
- Use prompt templates that enforce Given/When/Then structure

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-04 | Arela | Initial draft - dogfooding arela_prd |
