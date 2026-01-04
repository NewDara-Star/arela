# arela_status

Quick project health check.

## Purpose

A lightweight tool to verify Arela is working and see project state at a glance.

## Parameters

None.

## Returns

```
📊 Project Status: /path/to/project

AGENTS.md: ✅ Present
SCRATCHPAD.md: ✅ Present
Memory System: ✅ Initialized
```

## When to Use

- Quick sanity check that Arela is connected
- Verify files exist before deeper operations
- Debug connection issues

## Implementation

Located in `src/mcp/server.ts`.

## Related Tools

- [arela_context](/tools/context) — Full context load
