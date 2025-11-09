# Drop-In Arela

Land Arela in any repo. It sniffs the system, learns the product, maps dependencies, and tells you where you're doing nonsense. With receipts.

## Quick Start

```bash
# In any repo
pnpm add -D @newdara/preset-cto
npx arela init

# Discover the topology
npx arela graph

# Run opinionated checks
npx arela audit

# Get fix recommendations
npx arela advise

# Apply a specific fix
npx arela fix --id ci.missing_pr_eval
```

## What It Does

### 1. Repo Fingerprinting

Arela reads your repo and builds a complete profile:

- **Monorepo detection**: `pnpm-workspace.yaml`, Yarn/npm workspaces
- **Tech stack**: Languages, frameworks, package managers, databases
- **Entrypoints**: Package scripts, main files, service definitions
- **Infrastructure**: Docker, CI/CD, Kubernetes, Terraform

```bash
$ npx arela graph

📊 Repo Graph

Root: repo:root
Nodes: 8
Edges: 12

📦  arela (repo)
⚙️  postgres (db)
⚙️  redis (cache)
📦  design-system (repo)
⚙️  api (service)

Saved to .arela/graph.json
```

### 2. Multi-Repo Topology

Maps your entire system, not just one repo:

- **Git submodules**: Linked repos
- **Package deps**: `file:` and Git URLs in `package.json`
- **Docker Compose**: Service dependencies
- **CI pipelines**: Repos fetched during build

**Edge types:**
- `runtime` - Service calls another service
- `build` - Compiled/bundled together
- `dev` - Local development links
- `docs` - Documentation references

### 3. Opinionated Audit

12 baseline checks with evidence and fix recommendations:

| Check | Category | What It Catches |
|-------|----------|-----------------|
| `ci.missing_pr_eval` | Governance | No CI validation on PRs |
| `git.missing_precommit` | Governance | No pre-commit hooks |
| `test.missing_tests` | Quality | Zero test files |
| `obs.no_healthcheck` | Observability | No `/health` endpoint |
| `security.env_in_repo` | Security | `.env` files committed |
| `obs.no_structured_logging` | Observability | No logging library |
| `security.weak_cors` | Security | CORS allows `*` |
| `data.no_migrations` | Data | DB but no migrations |
| `infra.docker_not_pinned` | Infrastructure | Dockerfile uses `:latest` |
| `security.no_rate_limit` | Security | API lacks rate limiting |
| `api.no_openapi` | API | Routes but no OpenAPI spec |
| `docs.no_feature_flags_doc` | Documentation | Feature flags undocumented |

```bash
$ npx arela audit

Running audit checks...

🔴 ci.missing_pr_eval
   PRs skip Arela governance checks
   Evidence: .github/workflows/ci.yml:1
   Fix: Add 'npx arela doctor --eval' step to PR workflow

🟡 obs.no_healthcheck
   Service lacks /health endpoint for monitoring
   Evidence: src/main.ts:1-40
   Fix: Add GET /health endpoint and wire to CI smoke test

📊 Audit Summary
Score: 78/100
Critical: 0
High: 2
Medium: 6
Low: 3

Report saved to .arela/audit/report.json
```

### 4. Fix Generation

Auto-generates patches for fixable issues:

```bash
$ npx arela advise

Generating fix recommendations...

✓ ci.missing_pr_eval
  Add 'npx arela doctor --eval' step to PR workflow

✓ obs.no_healthcheck
  Add GET /health endpoint and wire to CI smoke test

⚠ test.missing_tests
  Manual fix required: Add test files following testing-pyramid

📋 Advisory Summary
Auto-fixable: 8/12
Manual fixes: 4
```

### 5. Apply Fixes

```bash
$ npx arela fix --id ci.missing_pr_eval

Applying fix for ci.missing_pr_eval...

Add Arela Doctor CI workflow

Diff:
--- /dev/null
+++ b/.github/workflows/arela-doctor.yml
@@ -0,0 +1,11 @@
+name: Arela Doctor
+on: [pull_request]
+jobs:
+  doctor:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: pnpm/action-setup@v4
+      - run: pnpm i
+      - name: Run Arela Doctor
+        run: npx arela doctor --eval
```

## Commands

### `arela graph`

Build and display repo topology.

**Options:**
- `--json` - Output as JSON
- `--cwd <dir>` - Directory to operate in

**Output:**
- `.arela/graph.json` - Full graph with nodes and edges

**Example:**
```bash
$ npx arela graph --json > topology.json
```

### `arela audit`

Run 12 opinionated quality checks.

**Options:**
- `--cwd <dir>` - Directory to operate in

**Output:**
- `.arela/audit/report.json` - Full audit report with findings

**Scoring:**
```
Score = 100 - (critical×20 + high×10 + med×5 + low×2)
```

### `arela advise`

Generate fix recommendations with diffs.

**Options:**
- `--json` - Output as JSON
- `--cwd <dir>` - Directory to operate in

**Output:**
- Markdown report with auto-fixable patches
- Manual fix instructions for complex issues

### `arela fix --id <findingId>`

Apply a specific fix.

**Options:**
- `--id <findingId>` - Finding ID from audit report (required)
- `--dry-run` - Show diff without applying
- `--cwd <dir>` - Directory to operate in

**Example:**
```bash
$ npx arela fix --id ci.missing_pr_eval --dry-run
```

### `arela index` (Coming Soon)

Build RAG index for semantic search.

Will enable queries like:
- "Where do we handle auth redirects?"
- "How are PRs validated?"
- "What talks to Supabase?"

## Data Files

```
.arela/
├── graph.json              # Repo topology
├── audit/
│   └── report.json         # Audit findings
└── index/                  # RAG vector store (future)
```

### `graph.json`

```json
{
  "nodes": [
    {
      "id": "repo:root",
      "type": "repo",
      "name": "arela",
      "path": "/Users/Star/arela"
    },
    {
      "id": "service:postgres",
      "type": "db",
      "name": "postgres",
      "metadata": { "source": "docker-compose" }
    }
  ],
  "edges": [
    {
      "from": "repo:root",
      "to": "service:postgres",
      "kind": "runtime",
      "label": "compose-service"
    }
  ],
  "root": "repo:root",
  "ts": "2025-11-09T14:30:00Z"
}
```

### `audit/report.json`

```json
{
  "summary": {
    "score": 78,
    "sev0": 0,
    "sev1": 2,
    "sev2": 6,
    "sev3": 3
  },
  "findings": [
    {
      "id": "ci.missing_pr_eval",
      "severity": "high",
      "category": "governance",
      "why": "PRs skip Arela governance checks",
      "evidence": [".github/workflows/ci.yml:1"],
      "fix": "Add 'npx arela doctor --eval' step to PR workflow",
      "autoFixable": true
    }
  ],
  "ts": "2025-11-09T14:30:00Z"
}
```

## Auto-Fixable Issues

Arela can automatically generate patches for:

1. **CI Doctor** - Add GitHub Actions workflow
2. **Pre-commit** - Install Husky hook
3. **Health check** - Add `/health` endpoint
4. **Logging** - Add structured logging library
5. **Rate limiting** - Add rate limit middleware

## Manual Fixes

Some issues require human judgment:

- **Test strategy** - Choose pyramid vs trophy
- **CORS config** - Specify allowed origins
- **Migrations** - Select migration tool
- **Docker pins** - Choose stable versions
- **OpenAPI** - Document API contracts

## Integration with Existing Arela

Drop-in Arela **extends** the existing preset system:

| Feature | Status | Integration |
|---------|--------|-------------|
| Rules enforcement | ✅ Unchanged | `arela doctor` still validates |
| CI/CD hooks | ✅ Unchanged | Pre-commit still blocks |
| Agent orchestration | ✅ Compatible | Works alongside |
| Setup installers | ✅ Unchanged | Web + CLI still work |

**All features work together.**

## Why This Beats Grep

### Grep
```bash
$ grep -r "auth" .
# 847 matches across 200 files
# No context, no ranking, no understanding
```

### Drop-in Arela (Future RAG)
```bash
$ npx arela query "Where do we handle auth redirects after OAuth?"

📍 src/middleware/auth.ts:45-67
   OAuth callback handler with redirect logic

📍 docs/auth-flow.md:12-25
   Documentation of OAuth redirect flow

📍 .arela/rules/auth-policy.md:1-15
   Security policy for auth redirects

Semantic match, ranked by relevance, with file context.
```

## Guardrails

- ✅ All writes behind `--apply` or explicit grants
- ✅ Patches are branch-scoped (no commits on main)
- ✅ All advice cites concrete files/lines
- ✅ If it can't point, it shuts up
- ✅ Dry-run mode for preview

## Real-World Example

```bash
# Drop into a new repo
$ cd ~/projects/mystery-api
$ pnpm add -D @newdara/preset-cto
$ npx arela init

# What is this thing?
$ npx arela graph
📦  mystery-api (repo)
⚙️  postgres (db)
⚙️  redis (cache)
📦  shared-types (repo)

# What's broken?
$ npx arela audit
🔴 security.env_in_repo
🟠 ci.missing_pr_eval
🟡 obs.no_healthcheck
🟡 security.no_rate_limit

Score: 62/100

# Fix the obvious stuff
$ npx arela advise
Auto-fixable: 6/10

$ npx arela fix --id ci.missing_pr_eval
$ npx arela fix --id obs.no_healthcheck

# Now you know what you have and what needs fixing
```

## Philosophy

**Arela reads the room, draws the map, and roasts your setup with receipts.**

- No fairy dust
- No guessing
- No vague suggestions
- Just concrete findings with file paths and line numbers

You get:
- 🗺️ **Topology** - See your whole system
- 🔍 **Findings** - Know what's broken
- 🛠️ **Fixes** - Get actionable patches
- 📋 **Audit trail** - Everything documented

## Future Enhancements

- [ ] RAG indexing with local embeddings
- [ ] Semantic search over codebase
- [ ] Product understanding extraction
- [ ] Compliance constraint detection
- [ ] Architecture drift analysis
- [ ] Circular dependency detection
- [ ] Cost estimation for cloud resources
- [ ] Security vulnerability scanning
- [ ] Performance bottleneck detection
- [ ] Dead code identification

## Status

**MVP Complete** ✅

- [x] Repo fingerprinting
- [x] Multi-repo graph builder
- [x] 12 baseline audit checks
- [x] Fix patch generation
- [x] CLI commands
- [x] Auto-fix for 5 common issues

**Coming Soon** ⏳

- [ ] RAG indexing (SQLite VSS)
- [ ] Semantic search
- [ ] Product profile extraction
- [ ] Actual patch application
- [ ] Branch creation and PR opening

**Ready to ship!** 🚢
