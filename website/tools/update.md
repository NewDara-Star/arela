# arela_update

Persist session memory to SCRATCHPAD.md.

## Purpose

Saves the current session state so future sessions can continue where you left off. This is the **core of context persistence**.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Text to save (min 10 chars) |
| `mode` | `"append"` \| `"replace"` | No | How to update (default: `append`) |

## Returns

```
✅ Scratchpad updated at /path/to/SCRATCHPAD.md
```

## Modes

### Append (Default)

Adds new content with a timestamp separator:

```markdown
[existing content]

---

## Update: 2026-01-04T12:00:00Z

[new content]
```

### Replace

⚠️ **Use with caution!** Replaces the entire file.

Must be explicitly specified: `mode: "replace"`

## Smart Merge

If you send JSON in a specific format, Arela will intelligently merge:

```json
{
  "progress": ["Built the login page", "Added validation"],
  "decisions": ["Using React Query for data fetching"],
  "nextSteps": ["Add error handling"]
}
```

This finds the current day's entry and updates instead of duplicating.

## Example Usage

At the end of a session:

```json
{
  "name": "arela_update",
  "arguments": {
    "content": "Completed user authentication. Next: add password reset.",
    "mode": "append"
  }
}
```

## When to Use

- **End of work session** — Save what was accomplished
- **After major decisions** — Record the reasoning
- **Before taking a break** — Capture next steps

## Implementation

Located in `src/mcp/server.ts` and `slices/memory/logic.ts`.

## Related Tools

- [arela_context](/tools/context) — Read the scratchpad
- [arela_focus](/tools/focus) — Compress if too long
