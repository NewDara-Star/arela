# ARELA-002: RAG Server Auto-Port Selection

**Complexity:** simple
**Priority:** medium
**Agent:** codex
**Estimated time:** 20m

## Context

RAG server currently fails if port 3456 is in use. Need auto-port selection to try alternative ports automatically.

## Requirements

1. Modify `src/rag/server.ts` to support `--auto-port` flag
2. Try ports 3456, 3457, 3458, etc. until one is available
3. Display which port was selected
4. Update CLI to pass `--auto-port` option

## Acceptance Criteria

- [ ] `npx arela serve --auto-port` tries multiple ports
- [ ] Server starts on first available port
- [ ] Clear message shows which port was selected
- [ ] Falls back gracefully if no ports available (3456-3465)
- [ ] Port selection is fast (< 100ms per attempt)

## Files to Modify

- `src/rag/server.ts` - Add port selection logic
- `src/cli.ts` - Add `--auto-port` flag to serve command

## Example Output

```bash
npx arela serve --auto-port

# Output:
# Port 3456 in use, trying 3457...
# ✅ RAG server started on http://localhost:3457
```

## Testing

```bash
# Start first server
npx arela serve &

# Start second with auto-port
npx arela serve --auto-port

# Should start on 3457
```

## Dependencies

None

## Tags

- v2.0.0
- rag
- quick-win
