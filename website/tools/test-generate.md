# arela_test_generate

Generate Gherkin features and TypeScript step definitions from a PRD.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prdPath` | string | Yes | Path to the PRD file (e.g., `prds/my-feature.prd.md` or `spec/prd.json`) |
| `featureId` | string | No | Required for JSON PRDs (e.g., `FEAT-001`) |

## Returns

JSON with generated file paths.

## Notes
- Requires `@cucumber/cucumber` and `tsx` in the project.
- Output is written under `spec/tests/features/` and `spec/tests/steps/`.
- If `prdPath` points to a JSON PRD, `featureId` is required and a single feature is generated.
- Generator includes 1 happy-path scenario and 2-4 pessimistic scenarios.

## Related
- `arela_test_run`
- `arela_prd`
