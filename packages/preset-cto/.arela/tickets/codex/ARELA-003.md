# ARELA-003: Enhanced Progress Bars with Speed Metrics

**Complexity:** simple
**Priority:** low
**Agent:** codex
**Estimated time:** 15m

## Context

Progress bars currently show percentage and ETA. Add files/second metric for better visibility into indexing speed.

## Requirements

1. Modify `src/utils/progress.ts` to track speed
2. Calculate files/second based on elapsed time
3. Display speed in progress bar output
4. Update RAG indexing to show speed

## Acceptance Criteria

- [ ] Progress bar shows files/second
- [ ] Speed updates in real-time
- [ ] Speed is accurate (not just instantaneous)
- [ ] Works with both sequential and parallel indexing

## Files to Modify

- `src/utils/progress.ts` - Add speed calculation
- `src/rag/index.ts` - Display speed metric

## Example Output

```bash
npx arela index --progress

# Output:
# Indexing: [████████░░] 80% (2946/3683) - ETA: 2m 15s - 24.5 files/sec
```

## Testing

```bash
# Test with progress
npx arela index --progress

# Verify speed metric appears
```

## Dependencies

None

## Tags

- v2.0.0
- ux
- nice-to-have
