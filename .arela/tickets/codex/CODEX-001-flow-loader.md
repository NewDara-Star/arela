# CODEX-001: Flow Loader and Parser

**Agent:** codex  
**Priority:** high  
**Complexity:** simple  
**Status:** pending

## Context
Need to load and parse YAML flow definitions from `.arela/flows/` directory for test execution.

## Technical Task
Create `src/run/flows.ts` with:
- `loadFlow(name: string)` - Load flow from `.arela/flows/{name}.yml`
- `parseFlow(yaml: string)` - Parse YAML into Flow type
- Flow validation (check required fields)
- Default flow if none specified

## Acceptance Criteria
- [ ] Can load flows from `.arela/flows/` directory
- [ ] Parses YAML with proper error handling
- [ ] Validates flow structure (name, steps array)
- [ ] Returns typed Flow object
- [ ] Handles missing files gracefully

## Files to Create
- `src/run/flows.ts`

## Types Needed
```typescript
export interface FlowStep {
  action: 'navigate' | 'click' | 'type' | 'waitFor' | 'screenshot';
  target?: string;
  selector?: string;
  value?: string;
  name?: string;
}

export interface Flow {
  name: string;
  steps: FlowStep[];
}
```

## Dependencies
- yaml package (already in dependencies)
- fs-extra (already in dependencies)

## Tests Required
- Unit tests for flow parsing
- Test with valid/invalid YAML
- Test missing file handling

## Example Flow File
```yaml
# .arela/flows/signup.yml
name: User Signup Flow
steps:
  - action: navigate
    target: /signup
  - action: click
    selector: button[data-testid="signup-button"]
  - action: type
    selector: input[name="email"]
    value: test@example.com
  - action: click
    selector: button[type="submit"]
```

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Test output showing flow loading works
