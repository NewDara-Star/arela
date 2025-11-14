# API Versioning Detection & Management

Version every breaking API change by introducing a brand-new slice (v2, v3, …) that runs alongside its predecessors. This document covers the workflow supported by the `arela version` commands.

## Detect Breaking Changes

Use `detect-drift` anytime a pull request modifies an OpenAPI contract:

```bash
npx arela version detect-drift
```

What it does:
- Diffs every `openapi/**/*.{yaml,yml,json}` file against the previous git commit
- Flags removed endpoints/operations
- Flags missing responses or schemas
- Highlights removed fields and type changes within response payloads
- Exits with code `1` when breaking changes are detected (ideal for CI)

Example output:

```
🔍 Checking for API drift...
🚨 removed-endpoint (openapi/workout-session.yaml)
   Endpoint: /api/v1/workout/session
   Method: GET
   Field: /api/v1/workout/session
   Old: /api/v1/workout/session
   New: removed

⚠️ changed-type (openapi/workout-session.yaml)
   Endpoint: /api/v1/workout/session
   Method: GET
   Field: userId
   Old: string
   New: number
```

## Create a New Slice Version

When drift is reported (or you know you are introducing a breaking change), spin up a side-by-side slice:

```bash
npx arela version create workout-session --version 2
```

The command:
1. Locates `features/workout-session` (or `src/features/workout-session`)
2. Copies it to `workout-session-v2`
3. Rewrites `/v1` markers in common file types to `/v2`
4. Finds the corresponding OpenAPI document and clones it to `*-v2.yaml`, rewriting the version marker

You will see the paths that were created so you can jump directly into implementation.

## CI Integration

Add the drift detector to your pull-request workflow to block unreviewed breaking changes:

```yaml
- name: Detect breaking API changes
  run: npx arela version detect-drift
```

Combine the warning with guidance in your contribution docs to steer engineers toward the versioning workflow above.
