# arela_focus

Compress long context to save token space.

## Purpose

When `SCRATCHPAD.md` gets too long (500+ lines), this tool:
1. Takes older entries
2. Sends them to an LLM for summarization
3. Replaces verbose history with concise summary
4. Keeps recent entries raw

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dryRun` | boolean | No | If true, shows summary without saving |

## Returns

### If scratchpad is short:
```
✅ Scratchpad is short (250 lines). No summarization needed.
```

### If summarized:
```
✅ Summarized 400 lines → 50 lines. Saved 350 lines of context.
```

## Configuration

```
MAX_LINES_RAW: 500    // Trigger threshold
RETAIN_LINES: 200     // Keep recent lines raw
```

## Engine

- **Model:** OpenAI `gpt-4o-mini`
- **Requires:** `OPENAI_API_KEY` in `.env`

## When to Use

- Before starting a complex task (need room)
- When context window is filling up
- Regularly as maintenance

## Implementation

Located in `slices/focus/ops.ts`.

## Related Tools

- [arela_context](/tools/context) — Read the scratchpad
- [arela_update](/tools/update) — Add to scratchpad
