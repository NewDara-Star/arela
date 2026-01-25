# arela_enforce

Generate a regression guard script based on a reported failure.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue` | string | Yes | Description of the failure/bug |
| `solution` | string | Yes | Strategy to prevent it |

## Returns

JSON with the generated script path.

## Notes
- Scripts are written to `scripts/guards/`.
- Add guard scripts to CI or `package.json` scripts manually.

## Related
- `arela_checklist`
