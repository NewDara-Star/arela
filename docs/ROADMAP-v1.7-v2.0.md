# Arela Roadmap: v1.7.0 - v2.0.0

**Based on:** Real-world usage session (2025-11-09)  
**Status:** Planning  
**Target:** Q4 2025 - Q1 2026

---

## 🎯 v1.7.0 - UX & Automation (Target: 2 weeks)

### High Priority - Quick Wins

#### 1. IDE Integration Automation
**Problem:** Manual `.windsurfrules` creation is error-prone

```bash
# Auto-create IDE rules
npx arela init --create-ide-rules
# Creates .windsurfrules, .cursorrules, .clinerules

# IDE-specific setup
npx arela setup --ide windsurf
npx arela setup --ide cursor
npx arela setup --ide cline
```

**Files to create:**
- `src/ide-setup.ts` - IDE rule generator
- `templates/ide/.windsurfrules` - Windsurf template
- `templates/ide/.cursorrules` - Cursor template
- `templates/ide/.clinerules` - Cline template

#### 2. Structure Validation
**Problem:** Tickets in wrong location, no validation

```bash
# Validate project structure
npx arela doctor --check-structure

# Output:
# ❌ Tickets found in docs/tickets/, should be in .arela/tickets/
# ❌ Missing .windsurfrules
# ✅ RAG index is up to date
# ✅ All rules present

# Auto-fix
npx arela doctor --fix
# Moves tickets, creates IDE rules, fixes structure
```

**Implementation:**
- Add `checkStructure()` to `doctor.ts`
- Add `--fix` flag to auto-correct issues
- Validate ticket locations
- Check for IDE rule files

#### 3. CLI RAG Search
**Problem:** Need curl to query RAG server

```bash
# Direct CLI search
npx arela search "ticket format" --top 3

# Output:
# 🔍 Searching: "ticket format"
# 
# 1. templates/.arela/ticket-template.md (score: 0.89)
#    Ticket format with acceptance criteria...
# 
# 2. docs/TICKETS.md (score: 0.76)
#    How to structure tickets...
# 
# 3. .arela/tickets/CODEX-001.md (score: 0.71)
#    Example ticket implementation...

# JSON output for scripting
npx arela search "security" --json
```

**Implementation:**
- Add `search` command to CLI
- Connect to RAG server or use direct search
- Format results nicely
- Add `--json` flag

#### 4. Sequential Indexing by Default
**Problem:** Parallel indexing is slow, no warning

```bash
# Default: sequential (fast)
npx arela index

# Opt-in to parallel
npx arela index --parallel

# With progress
npx arela index --progress
# [████████░░] 80% (2946/3683) - ETA: 2m 15s
```

**Implementation:**
- Change default to sequential
- Add `--parallel` flag
- Add progress bar with ETA
- Show files/second rate

---

## 🚀 v1.8.0 - Agent Orchestration (Target: 3 weeks)

### Agent Dispatch & Tracking

#### 1. Agent Discovery Enhancement
**Already shipped in v1.5.2, enhance further:**

```bash
# Show available agents with capabilities
npx arela agents discover --verbose

# Output:
# ✓ OpenAI (Codex CLI) - 2025 Q4
#   Type: cli
#   Cost: $0.002/1K tokens
#   Best for: Fast implementation, simple tasks
#   Models: gpt-5, gpt-4o, o3-mini
# 
# ✓ Claude (Anthropic)
#   Type: cli
#   Cost: $0.015/1K tokens
#   Best for: Deep reasoning, complex refactoring
#   Models: claude-sonnet-4.5, claude-opus-4
```

#### 2. Ticket Dispatch
**Problem:** No built-in way to assign tickets to agents

```bash
# Dispatch single ticket
npx arela dispatch CODEX-001 --to openai-codex

# Dispatch multiple tickets
npx arela dispatch CODEX-001,CODEX-002 --to openai-codex

# Auto-dispatch based on complexity
npx arela dispatch --auto
# Analyzes tickets, assigns to best agent based on:
# - Complexity (simple → Codex, complex → Claude)
# - Cost optimization
# - Agent availability

# Batch dispatch
npx arela orchestrate --agent codex --tickets CODEX-*
```

**Implementation:**
- `src/dispatch.ts` - Ticket dispatch logic
- Update `.ticket-status.json` with assignments
- Track agent progress
- Cost estimation per dispatch

#### 3. Agent Status Tracking
**Problem:** No visibility into agent progress

```bash
# Check agent status
npx arela status --agent codex

# Output:
# Agent: Codex (OpenAI)
# 
# ✅ CODEX-001: Complete (2m 15s, $0.12)
# ⏳ CODEX-002: In Progress (45s elapsed)
# 📋 CODEX-003: Pending
# ❌ CODEX-004: Failed (retry available)
# 
# Total: 4 tickets, 1 complete, 1 in progress, 1 pending, 1 failed
# Cost: $0.12 spent, $0.35 estimated remaining

# All agents
npx arela status --all
```

**Implementation:**
- Track ticket state in `.ticket-status.json`
- Add timestamps and duration
- Track costs per ticket
- Show progress indicators

#### 4. Dependency Management
**Problem:** No ticket dependency tracking

```bash
# Show dependency graph
npx arela tickets graph

# Output (ASCII art):
# TICKET-001 (Complete)
#   ├─ CODEX-001 (Complete)
#   ├─ CODEX-002 (In Progress)
#   └─ CLAUDE-001 (Pending - blocked)
# 
# TICKET-002 (Pending)
#   └─ DEEPSEEK-001 (Pending)

# Show next available tickets
npx arela tickets next

# Output:
# Available to start:
# 1. CODEX-002 (no dependencies)
# 2. DEEPSEEK-001 (no dependencies)
# 
# Blocked:
# - CLAUDE-001 (waiting for CODEX-002)

# Visualize in browser
npx arela tickets graph --web
# Opens interactive dependency graph
```

**Implementation:**
- Add `parent` field to ticket format
- Build dependency tree
- Check for circular dependencies
- Show critical path

---

## 📊 v1.9.0 - Compliance & Reporting (Target: 2 weeks)

### Compliance Tracking

#### 1. Historical Tracking
**Problem:** No compliance history

```bash
# Track compliance over time
npx arela doctor --track

# Stores in .arela/compliance-history.json:
{
  "2025-11-09": {
    "score": 85,
    "violations": 12,
    "rules_checked": 140
  },
  "2025-11-02": {
    "score": 70,
    "violations": 24,
    "rules_checked": 140
  }
}
```

#### 2. Compliance Dashboard
**Problem:** Can't see trends

```bash
# Show compliance dashboard
npx arela compliance

# Output:
# 📊 Compliance Trend (Last 4 Weeks)
# 
# Week 1: 52% ████████░░░░░░░░░░
# Week 2: 70% ████████████░░░░░░
# Week 3: 85% ███████████████░░░
# Week 4: 92% ██████████████████
# 
# Trending: +40% in 4 weeks ✅
# 
# Top Violations:
# 1. Missing test coverage (8 occurrences)
# 2. Console.log in production (4 occurrences)
# 3. Hardcoded credentials (2 occurrences)
# 
# Improvements:
# - Security scanning: 0 → 100% ✅
# - Documentation: 60% → 95% ✅
# - Testing: 40% → 75% 📈
```

#### 3. Compliance Reports
**Problem:** No exportable reports

```bash
# Generate markdown report
npx arela report --format markdown > compliance-report.md

# Generate JSON for CI
npx arela report --format json > compliance.json

# Generate HTML dashboard
npx arela report --format html --output ./reports/

# CI integration
npx arela report --ci
# Exits with code 1 if compliance < 80%
```

**Implementation:**
- `src/compliance-tracker.ts` - Track history
- `src/report-generator.ts` - Generate reports
- Templates for markdown/HTML reports
- CI-friendly exit codes

---

## 🎨 v1.10.0 - Better Ticket Format (Target: 1 week)

### YAML Ticket Schema

**Problem:** Markdown tickets are hard to parse

```yaml
# .arela/tickets/CODEX-001.yaml
id: CODEX-001
title: Add security scanning
agent: codex
parent: TICKET-004
priority: highest
complexity: simple
status: pending
estimated_time: 30m
estimated_cost: $0.15

context: |
  Part of security scanning initiative.
  Need to add SECURITY.md and Dependabot config.

requirements:
  - Create SECURITY.md with vulnerability reporting process
  - Add Dependabot configuration for dependency updates
  - Configure security scanning in CI

acceptance:
  - id: ac-1
    description: SECURITY.md created with all required sections
    status: pending
    test: "test -f SECURITY.md && grep -q 'Reporting' SECURITY.md"
  
  - id: ac-2
    description: Dependabot config validates
    status: pending
    test: "npx arela validate .github/dependabot.yml"
  
  - id: ac-3
    description: CI workflows pass validation
    status: pending
    test: "npx arela test workflows"

files:
  - path: SECURITY.md
    action: create
    template: templates/SECURITY.md
  
  - path: .github/dependabot.yml
    action: create
    template: templates/dependabot.yml

dependencies:
  - TICKET-004  # Parent ticket

tags:
  - security
  - compliance
  - quick-win

metadata:
  created: 2025-11-09T14:30:00Z
  updated: 2025-11-09T15:45:00Z
  assigned: 2025-11-09T15:45:00Z
  started: null
  completed: null
```

**Implementation:**
- Add YAML parser
- Create JSON schema for validation
- Support both YAML and Markdown
- Migration tool: `npx arela migrate tickets --to yaml`

---

## 💰 v1.11.0 - Cost Tracking (Target: 1 week)

### Cost Management

#### 1. Cost Tracking
**Problem:** No visibility into costs

```bash
# Show costs
npx arela costs

# Output:
# 💰 Agent Costs (Last 7 Days)
# 
# OpenAI (Codex):
#   Tokens: 80,000 (60K input, 20K output)
#   Cost: $1.60
#   Tickets: 12 completed
#   Avg: $0.13/ticket
# 
# Claude (Anthropic):
#   Tokens: 15,000 (10K input, 5K output)
#   Cost: $2.25
#   Tickets: 3 completed
#   Avg: $0.75/ticket
# 
# DeepSeek:
#   Tokens: 50,000 (40K input, 10K output)
#   Cost: $0.50
#   Tickets: 8 completed
#   Avg: $0.06/ticket
# 
# Total: $4.35 (145K tokens, 23 tickets)
# Avg: $0.19/ticket

# Cost by ticket
npx arela costs --by-ticket

# Cost trends
npx arela costs --trend
```

#### 2. Cost Optimization
**Problem:** Can't optimize agent selection

```bash
# Get optimization suggestions
npx arela optimize

# Output:
# 💡 Cost Optimization Suggestions
# 
# 1. TICKET-007: Use Codex instead of Claude
#    Current: $0.75 (Claude)
#    Optimized: $0.13 (Codex)
#    Savings: $0.62 (83%)
#    Reason: Simple implementation task
# 
# 2. TICKET-009: Use DeepSeek instead of Claude
#    Current: $0.75 (Claude)
#    Optimized: $0.06 (DeepSeek)
#    Savings: $0.69 (92%)
#    Reason: Code generation task
# 
# Total potential savings: $1.31/day = $39/month

# Apply optimizations
npx arela optimize --apply
```

**Implementation:**
- Track token usage per ticket
- Store costs in `.arela/costs.json`
- Cost estimation before dispatch
- Optimization recommendations

---

## 🧪 v1.12.0 - Testing Integration (Target: 1 week)

### Automated Testing

#### 1. Ticket Testing
**Problem:** No automated acceptance validation

```bash
# Test ticket acceptance criteria
npx arela test TICKET-001

# Output:
# 🧪 Testing TICKET-001: Add security scanning
# 
# ✅ AC-1: SECURITY.md created
#    Test: test -f SECURITY.md && grep -q 'Reporting' SECURITY.md
#    Result: Pass
# 
# ✅ AC-2: Dependabot config validates
#    Test: npx arela validate .github/dependabot.yml
#    Result: Pass
# 
# ❌ AC-3: CI workflows pass validation
#    Test: npx arela test workflows
#    Result: Fail - workflow syntax error on line 15
# 
# Result: 2/3 criteria met (67%)
# Status: Not ready for completion

# Test all pending tickets
npx arela test --all-pending
```

#### 2. CI Integration
**Problem:** No CI validation

```bash
# CI validation
npx arela ci --ticket TICKET-001

# Output:
# 🔍 CI Validation: TICKET-001
# 
# ✅ All acceptance criteria met
# ✅ Tests pass
# ✅ Compliance check pass (92%)
# ✅ No new violations introduced
# 
# Status: Ready to merge ✅

# Block merge if criteria not met
npx arela ci --ticket TICKET-001 --strict
# Exits with code 1 if not ready
```

**Implementation:**
- `src/testing.ts` - Test runner
- Support shell commands in acceptance criteria
- CI-friendly output
- GitHub Actions integration

---

## 🔮 v2.0.0 - Advanced Features (Target: Q1 2026)

### Major Enhancements

#### 1. Pattern Learning Transparency
```bash
# Show pattern thresholds
npx arela patterns --explain

# Output:
# 📊 Pattern Learning Configuration
# 
# Thresholds:
# - Create pattern: 3 occurrences across 2 projects
# - Suggest rule: 5 occurrences across 3 projects
# - Auto-enforce: 10 occurrences across 5 projects
# 
# Current patterns:
# 1. "console.log in production" (8 occurrences, 4 projects)
#    Status: Suggested rule (pending approval)
# 
# 2. "Missing error handling" (12 occurrences, 6 projects)
#    Status: Auto-enforced ✅

# Manually add pattern
npx arela patterns add \
  --violation "console.log in production" \
  --rule "Use structured logging (logger.info)" \
  --severity high

# Team patterns
npx arela patterns sync --team
npx arela patterns approve PATTERN-001
```

#### 2. LSP Server for Real-Time Checking
```bash
# Start LSP server
npx arela lsp

# Provides inline warnings in IDE:
# ⚠️ This violates arela.security_first
# 💡 Quick fix: Replace with logger.info()
```

#### 3. Auto-Generate Tickets from Audit
```bash
# Create tickets from violations
npx arela audit --create-tickets

# Output:
# 🎫 Generated Tickets:
# 
# CODEX-001: Fix console.log in production (8 occurrences)
#   Priority: high
#   Estimated: 15m
# 
# CLAUDE-001: Add error handling to API routes (4 occurrences)
#   Priority: medium
#   Estimated: 1h
# 
# DEEPSEEK-001: Update outdated dependencies (12 packages)
#   Priority: low
#   Estimated: 30m
# 
# Created 3 tickets in .arela/tickets/
```

#### 4. RAG Server Improvements
```bash
# Auto port selection
npx arela serve --auto-port
# Port 3456 in use, trying 3457... ✅ Started on 3457

# Better progress
npx arela index --progress
# [████████░░] 80% (2946/3683) - ETA: 2m 15s
# Speed: 24.5 files/sec
```

---

## 📅 Release Timeline

| Version | Target Date | Focus | Status |
|---------|------------|-------|--------|
| v1.7.0 | 2025-11-23 | UX & Automation | Planning |
| v1.8.0 | 2025-12-14 | Agent Orchestration | Planning |
| v1.9.0 | 2025-12-28 | Compliance & Reporting | Planning |
| v1.10.0 | 2026-01-04 | Better Ticket Format | Planning |
| v1.11.0 | 2026-01-11 | Cost Tracking | Planning |
| v1.12.0 | 2026-01-18 | Testing Integration | Planning |
| v2.0.0 | 2026-02-01 | Advanced Features | Planning |

---

## 🎯 Priority Matrix

### Must Have (v1.7.0)
1. ✅ IDE rule auto-creation
2. ✅ Structure validation (`--check-structure`)
3. ✅ CLI RAG search
4. ✅ Sequential indexing default

### Should Have (v1.8.0)
5. ✅ Agent dispatch
6. ✅ Agent status tracking
7. ✅ Dependency graph
8. ✅ Cost estimation

### Nice to Have (v1.9.0+)
9. ✅ Compliance history
10. ✅ YAML ticket format
11. ✅ Pattern transparency
12. ✅ LSP server

---

## 🚀 Quick Wins (Ship First)

These can be done in 1-2 days each:

1. **CLI RAG Search** - Add `search` command
2. **Structure Validation** - Add `--check-structure` flag
3. **IDE Setup** - Auto-create `.windsurfrules`
4. **Sequential Indexing** - Change default behavior
5. **Progress Bars** - Add to indexing

---

## 📝 Implementation Notes

### Breaking Changes
- v2.0.0 will introduce YAML ticket format (with migration tool)
- LSP server requires IDE plugin updates

### Backward Compatibility
- All v1.x releases maintain backward compatibility
- Markdown tickets supported until v3.0.0
- Migration tools provided for all format changes

### Testing Strategy
- Dogfood all features on Arela itself
- Beta testing with 5-10 early adopters
- CI integration testing
- Performance benchmarks

---

## 🤝 Community Feedback

**Based on real usage session 2025-11-09:**

✅ What worked well:
- Multi-agent orchestration concept
- RAG integration
- Rule-based approach
- CLI-first design

❌ Pain points discovered:
- Manual IDE setup
- Unclear ticket locations
- No cost visibility
- Missing automation

💡 Most requested:
1. Auto-create IDE rules (unanimous)
2. Better ticket structure (high demand)
3. Cost tracking (essential for teams)
4. Compliance trending (nice insight)

---

## 📊 Success Metrics

### v1.7.0 Goals
- Setup time: < 2 minutes (from 10+ minutes)
- Structure errors: 0 (from common)
- RAG queries: CLI-first (from curl-only)

### v1.8.0 Goals
- Agent dispatch: Automated (from manual)
- Ticket tracking: Real-time (from static)
- Cost visibility: 100% (from 0%)

### v2.0.0 Goals
- Compliance: 95%+ (from 70%)
- Automation: 80% (from 20%)
- Team adoption: 10+ projects

---

**Next Steps:**
1. Review and prioritize roadmap
2. Create GitHub issues for v1.7.0
3. Start with quick wins
4. Ship v1.7.0 in 2 weeks

**Feedback welcome!** 🚀
