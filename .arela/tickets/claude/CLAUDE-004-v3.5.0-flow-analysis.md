# CLAUDE-004: End-to-End Flow Analysis (v3.5.0)

**Agent:** claude  
**Priority:** critical  
**Complexity:** complex  
**Status:** pending

**Note:** Moved to v3.5.0. v3.4.0 is reserved for:
- AI-powered UX analysis
- Accessibility scanning (WCAG)
- Visual regression testing
- Performance monitoring

## Context

**The Problem:** Users don't always know when code is messy or violates best practices. They need a CTO who can:
1. **Trace flows end-to-end** - From API endpoint → business logic → data storage → UI
2. **Understand intent** - What is this flow supposed to do?
3. **Check standards** - Does it follow best practices?
4. **Propose refactors** - If not, how to fix it?

**User Quote:** "I don't even know when code is messy, that's why I need a CTO"

## The Vision

```bash
$ arela analyze flow "user login"

🔍 Tracing "user login" flow end-to-end...

📍 Entry Point: POST /api/auth/login (stride-api/app/auth.py:45)
  ↓
🔐 Authentication: apiClient.login() (stride-mobile/api/client.ts:89)
  ↓
💾 State Update: authStore.login() (stride-mobile/stores/authStore.ts:78)
  ↓
🔄 Side Effects:
  - Saves tokens to SecureStore
  - Clears guest mode data
  - Updates user state
  ↓
🎨 UI Update: Navigation to /(tabs) (stride-mobile/app/index.tsx:32)

📊 Flow Analysis:

✅ Good Practices:
  1. Tokens stored securely (SecureStore)
  2. Error handling present
  3. Loading states managed

⚠️  Issues Found:
  1. Token refresh logic duplicated (3 locations)
  2. No retry on network failure
  3. Guest mode cleanup could fail silently
  4. Navigation happens before state fully persists

🎯 Standards Violations:
  1. Security: Token not validated before storage
  2. UX: No offline handling
  3. Architecture: Business logic in UI store

💡 Recommended Refactors:

  1. CRITICAL: Validate token before storage
     Files: stride-mobile/stores/authStore.ts:85
     Effort: 30 minutes
     
  2. HIGH: Extract token refresh to utility
     Files: authStore.ts, apiClient.ts, middleware.ts
     Effort: 1 hour
     
  3. MEDIUM: Add retry logic with exponential backoff
     Files: stride-mobile/api/client.ts:89
     Effort: 45 minutes

Create tickets for these refactors? [Y/n]
```

## Technical Implementation

### 1. Flow Discovery

**Detect flow entry points:**
```typescript
interface FlowEntryPoint {
  type: 'api_endpoint' | 'user_action' | 'event_handler' | 'scheduled_job';
  location: string;
  description: string;
}

async function discoverFlows(cwd: string): Promise<FlowEntryPoint[]> {
  // Scan for:
  // - API routes (FastAPI, Express, etc.)
  // - UI event handlers (onPress, onClick, etc.)
  // - Background jobs (cron, workers)
  // - WebSocket handlers
}
```

### 2. Flow Tracing

**Follow the execution path:**
```typescript
interface FlowStep {
  type: 'function_call' | 'state_update' | 'api_call' | 'db_query' | 'ui_render';
  location: string;
  description: string;
  dependencies: string[];
}

async function traceFlow(entryPoint: FlowEntryPoint): Promise<FlowStep[]> {
  // Use AST parsing + semantic search to:
  // 1. Find function calls
  // 2. Track state changes
  // 3. Identify side effects
  // 4. Map data transformations
}
```

### 3. Standards Checking

**Check against best practices:**
```typescript
interface Standard {
  category: 'security' | 'performance' | 'ux' | 'architecture';
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (flow: FlowStep[]) => boolean;
}

const standards: Standard[] = [
  {
    category: 'security',
    rule: 'Validate tokens before storage',
    severity: 'critical',
    check: (flow) => {
      // Check if token validation happens before SecureStore.setItem
    }
  },
  {
    category: 'ux',
    rule: 'Handle offline scenarios',
    severity: 'high',
    check: (flow) => {
      // Check if network errors are caught and handled
    }
  },
  {
    category: 'architecture',
    rule: 'Separate business logic from UI',
    severity: 'medium',
    check: (flow) => {
      // Check if business logic is in stores/components
    }
  }
];
```

### 4. Refactor Proposals

**Generate actionable tickets:**
```typescript
interface RefactorProposal {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  files: string[];
  estimatedEffort: string;
  steps: string[];
}

async function generateRefactors(
  flow: FlowStep[],
  violations: Standard[]
): Promise<RefactorProposal[]> {
  // For each violation:
  // 1. Identify root cause
  // 2. Propose fix
  // 3. Estimate effort
  // 4. Create ticket
}
```

## Example Flows to Analyze

### 1. User Login
**Entry:** POST /api/auth/login  
**Path:** API → Client → Store → UI  
**Check:** Token security, error handling, state persistence

### 2. Create Workout
**Entry:** onPress "Create Workout"  
**Path:** UI → Store → API → Database → UI Update  
**Check:** Validation, optimistic updates, error recovery

### 3. Guest Mode
**Entry:** "Continue as Guest"  
**Path:** UI → Store → Navigation  
**Check:** State isolation, upgrade path, data persistence

### 4. Token Refresh
**Entry:** API 401 response  
**Path:** Interceptor → Refresh → Retry  
**Check:** Race conditions, infinite loops, token storage

## CLI Commands

```bash
# Discover all flows
arela flows

# Analyze specific flow
arela analyze flow "user login"

# Analyze all flows
arela analyze flows --all

# Check specific standard
arela analyze flow "user login" --standard security

# Auto-fix violations
arela analyze flow "user login" --fix
```

## Output Format

### Summary View
```
📊 Flow Analysis Summary

Flows Analyzed: 12
✅ Passing: 8
⚠️  Issues: 3
❌ Critical: 1

Top Issues:
1. Token validation missing (CRITICAL)
2. No offline handling (HIGH)
3. Duplicated logic (MEDIUM)
```

### Detailed View
```
🔍 Flow: User Login

Entry Point: POST /api/auth/login
Steps: 8
Duration: ~200ms
Files: 5

Flow Trace:
1. API Endpoint (stride-api/app/auth.py:45)
   └─ Validates credentials
   └─ Generates JWT token
   
2. API Client (stride-mobile/api/client.ts:89)
   └─ Sends request
   └─ Handles response
   
3. Auth Store (stride-mobile/stores/authStore.ts:78)
   └─ Saves tokens
   └─ Updates user state
   └─ Clears guest data
   
4. Navigation (stride-mobile/app/index.tsx:32)
   └─ Redirects to /(tabs)

Standards Check:
✅ PASS: Error handling present
✅ PASS: Loading states managed
❌ FAIL: Token not validated before storage
⚠️  WARN: No retry on network failure

Recommendations:
1. Add token validation (CRITICAL)
2. Implement retry logic (HIGH)
3. Extract token refresh (MEDIUM)
```

## Integration with Existing Features

**1. RAG Search**
- Use semantic search to find related code
- Understand intent from comments/docs

**2. Multi-Agent Orchestration**
- Create tickets for refactors
- Delegate to Codex/Claude

**3. Visual Testing**
- Test flows end-to-end
- Verify refactors don't break UX

**4. Smart Ragignore**
- Ignore generated files during analysis
- Focus on source code

## Acceptance Criteria

- [ ] Discovers flows automatically (API, UI, events)
- [ ] Traces execution path end-to-end
- [ ] Identifies all files involved
- [ ] Maps data transformations
- [ ] Checks against standards (security, UX, architecture)
- [ ] Detects violations with severity
- [ ] Proposes actionable refactors
- [ ] Estimates effort for each refactor
- [ ] Creates tickets automatically
- [ ] Generates visual flow diagrams (optional)
- [ ] Works across frontend and backend
- [ ] Handles async operations
- [ ] Detects race conditions
- [ ] Finds duplicated logic
- [ ] Suggests consolidation opportunities

## Files to Create

- `src/analysis/flow-discovery.ts` - Find entry points
- `src/analysis/flow-tracer.ts` - Trace execution
- `src/analysis/standards.ts` - Define standards
- `src/analysis/refactor-proposals.ts` - Generate tickets
- `src/cli.ts` - Add `arela analyze` command

## Philosophy Alignment

**This is EXACTLY what a CTO does:**
- Understands the system end-to-end
- Spots issues you don't see
- Proposes concrete fixes
- Prioritizes by impact
- Teaches you what "good" looks like

**User Quote:** "I don't even know when code is messy"  
**Arela Response:** "Let me show you. Here's what good looks like."

## Benefits

1. **Educational** - Learn what good code looks like
2. **Actionable** - Concrete steps to improve
3. **Prioritized** - Focus on what matters
4. **Safe** - Incremental refactors, not rewrites
5. **Comprehensive** - Checks security, UX, architecture

## Example Session

```
You: "Analyze the login flow"

Arela: *traces from API to UI*

"Found 8 steps across 5 files.

Issues:
1. CRITICAL: Token not validated (security risk)
2. HIGH: No offline handling (bad UX)
3. MEDIUM: Logic duplicated in 3 places

Want me to fix these? I'll create 3 tickets."

You: "Yes, fix the critical one first"

Arela: *creates ticket CODEX-001*
*Codex implements token validation*
*Runs tests*

"✅ Fixed! Token now validated before storage.
Want me to tackle the offline handling next?"
```

---

**This is the feature that makes Arela a TRUE CTO.** 🎯

Not just a code generator. A system analyst who understands your entire application and teaches you how to make it better.

**Want to implement this for v3.4.0?** This would be HUGE.
