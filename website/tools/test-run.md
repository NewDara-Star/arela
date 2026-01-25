# arela_test_run

Run a generated Gherkin feature file.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `featurePath` | string | Yes | Path to the `.feature` file |

## Returns

JSON with pass/fail result and duration.

## Notes
- Uses Cucumber with the `tsx` loader for ESM.
- Default steps path is `spec/tests/steps/*.ts` (falls back to `tests/steps/*.ts`).

## Related
- `arela_test_generate`
