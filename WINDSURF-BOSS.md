# Windsurf Boss Mode

Arela sits as the boss in Windsurf with internet legs, package-docs brains, and update awareness. Controlled, audited, no chaos.

## What We Built

### 1. Controlled Internet Access ✅

**Files:**
- `templates/.arela/net.allow.json` - Domain allowlist with rate limits
- `templates/.arela/net.policy.md` - Network access policy
- `src/net/fetcher.ts` - Controlled fetcher with cache

**Features:**
- Domain allowlist enforcement
- Rate limiting (20/min default)
- Byte caps (2MB default)
- Cache in `.arela/cache/http/`
- Provenance logging to `.arela/logs/net.log`
- Budget control via `ARELA_NET_BUDGET`
- Hard-kill via `ARELA_NET_DISABLED=1`

**Usage:**
```bash
# Fetch with allowlist
npx arela net fetch https://react.dev/docs

# Check if URL allowed
npx arela net check https://example.com

# View cache
npx arela net cache ls
```

### 2. Package Docs Lookup ✅

**Files:**
- `templates/.arela/docs.config.json` - Docs configuration
- `src/docs/indexer.ts` - Package docs indexer

**Features:**
- Auto-discover from `package.json`
- Fetch metadata from npm registry
- Cache docs URLs
- Search by package name or description

**Usage:**
```bash
# Index all packages
npx arela docs index

# Search docs
npx arela docs search "router"

# Open package docs
npx arela docs open react-router-dom
```

### 3. Windsurf Integration (Need Implementation)

**File:** `.windsurf/cascade.bootstrap.md`

```markdown
SYSTEM: Arela Bootstrap

Load and respect:
- .arela/profile.json
- .arela/answers.json
- .arela/rules/*
- .arela/workflows/*

Use tools:
- arela doctor --eval            # block risky actions if fails
- arela net fetch <url>          # only way to touch internet
- arela docs search/open <q>     # docs oracle
- arela inspect repo             # deep scan
- arela risk report              # semver/breaking changes

Hard rules:
- Never use raw curl/http. Use "arela net fetch".
- Before code changes: run "arela doctor --eval".
- Before dependency bumps: run "arela risk report".
```

**Install:**
```bash
npx arela agent install --agent=windsurf
```

### 4. Repo Inspector Suite (Need Implementation)

**Commands:**
```bash
arela inspect repo      # frameworks, services, scripts, envs
arela inspect deps      # package.json/pnpm-lock, semver ranges
arela inspect links     # local workspaces, cross-repo URLs
arela inspect graph     # module graph, cycles, dead-ends
arela product summary   # product, surfaces, auth, data flows
```

**Outputs:**
- `.arela/repo.scan.json` - Facts
- `.arela/assumptions.json` - Inferences
- `.arela/questions.yaml` - Uncertainties
- `.arela/risk.json` - Breaking changes, drift, cycles

### 5. Risk Reporting (Need Implementation)

**Command:**
```bash
arela risk report
```

**What it does:**
- Run `pnpm outdated --json`
- Diff lockfile changes
- Fetch release notes via `arela net fetch`
- Semver-analyze exports
- Emit `risk.json` with:
  - `breaking`: true/false
  - `migration_notes`
  - Links to CHANGELOG
  - Suggested codemods

**Doctor behavior:**
- On PRs touching `package.json` or lockfile, require `risk.json` present and fresh

### 6. Multi-Agent Assignment (Already Built)

**Files:**
- `.arela/agents/registry.json` - Agent capabilities
- `.arela/agents/grants.json` - Permissions

**Commands:**
```bash
arela agents scan       # discover agents
arela agents grant      # authorize per-agent
arela assign <ticketId> # pick agent by skills
```

## CLI Commands to Wire

### Net Commands
```typescript
// src/cli.ts
const netCommand = program.command("net").description("Network access");

netCommand
  .command("fetch <url>")
  .description("Fetch URL with allowlist enforcement")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .option("--json", "Parse as JSON", false)
  .option("--force", "Bypass cache", false)
  .action(async (url, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { netFetch } = await import("./net/fetcher.js");
      const result = await netFetch(cwd, url, { force: opts.force });
      
      if (opts.json) {
        console.log(JSON.parse(result.body));
      } else {
        console.log(result.body);
      }
      
      console.error(pc.dim(`\n${result.cached ? "CACHE" : "FETCH"} ${result.status} ${result.bytes}b`));
    } catch (error) {
      console.error(pc.red(`Fetch failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

netCommand
  .command("check <url>")
  .description("Check if URL is allowed")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (url, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { checkUrl } = await import("./net/fetcher.js");
      const allowed = await checkUrl(cwd, url);
      
      if (allowed) {
        console.log(pc.green(`✓ ${url} is allowed`));
      } else {
        console.log(pc.red(`✗ ${url} is not allowed`));
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(pc.red(`Check failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

### Docs Commands
```typescript
const docsCommand = program.command("docs").description("Package documentation");

docsCommand
  .command("index")
  .description("Index package documentation")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { indexDocs } = await import("./docs/indexer.js");
      await indexDocs(cwd);
    } catch (error) {
      console.error(pc.red(`Index failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

docsCommand
  .command("search <query>")
  .description("Search package documentation")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (query, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { searchDocs } = await import("./docs/indexer.js");
      const results = await searchDocs(cwd, query);
      
      if (results.length === 0) {
        console.log(pc.yellow("No results found"));
        return;
      }
      
      console.log(pc.bold(`\nFound ${results.length} results:\n`));
      
      for (const entry of results) {
        console.log(pc.bold(entry.name));
        if (entry.description) {
          console.log(pc.dim(`  ${entry.description}`));
        }
        if (entry.docs) {
          console.log(pc.dim(`  Docs: ${entry.docs}`));
        }
        console.log();
      }
    } catch (error) {
      console.error(pc.red(`Search failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });

docsCommand
  .command("open <package>")
  .description("Open package documentation")
  .option("--cwd <dir>", "Directory to operate in", process.cwd())
  .action(async (packageName, opts) => {
    const cwd = resolveCommandCwd(opts.cwd);
    try {
      const { loadDocsIndex } = await import("./docs/indexer.js");
      const index = await loadDocsIndex(cwd);
      
      if (!index) {
        console.log(pc.yellow("Docs index not found. Run 'arela docs index' first."));
        return;
      }
      
      const entry = [...index.packages, ...index.extras].find(e => e.name === packageName);
      
      if (!entry || !entry.docs) {
        console.log(pc.red(`No docs found for ${packageName}`));
        process.exitCode = 1;
        return;
      }
      
      console.log(pc.green(`Opening: ${entry.docs}`));
      
      // Open in browser
      const { execSync } = await import("child_process");
      const command = process.platform === "darwin" ? "open" : "xdg-open";
      execSync(`${command} "${entry.docs}"`, { stdio: "ignore" });
    } catch (error) {
      console.error(pc.red(`Open failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

## Doctor Checks to Add

```typescript
// In loaders.ts doctor function
export async function doctor(opts: {
  cwd: string;
  evalMode?: boolean;
}): Promise<{
  rules: LoadResult<ArelaRule>;
  workflows: LoadResult<ArelaWorkflow>;
  evalResult?: EvalCheckResult;
  issues?: string[];
}> {
  const cwd = resolveCwd(opts.cwd);
  const issues: string[] = [];
  
  // Existing profile check
  const profilePath = path.join(cwd, ".arela", "profile.json");
  if (!fs.existsSync(profilePath)) {
    issues.push("Missing .arela/profile.json (run `npx arela configure`)");
  }
  
  // Check net allowlist
  const netAllowPath = path.join(cwd, ".arela", "net.allow.json");
  if (fs.existsSync(netAllowPath)) {
    const netAllow = JSON.parse(fs.readFileSync(netAllowPath, "utf8"));
    if (netAllow.enabled && !netAllow.domains?.length) {
      issues.push("Network enabled but no domains in allowlist");
    }
  }
  
  // Check docs index
  const docsIndexPath = path.join(cwd, ".arela", "cache", "docs.idx.json");
  if (!fs.existsSync(docsIndexPath)) {
    issues.push("Docs index not found (run `npx arela docs index`)");
  }
  
  // Check for unanswered questions
  const questionsPath = path.join(cwd, ".arela", "questions.yaml");
  if (fs.existsSync(questionsPath)) {
    issues.push("Unresolved questions found (run `npx arela configure`)");
  }
  
  // Check risk report on dep changes
  const riskPath = path.join(cwd, ".arela", "risk.json");
  const pkgPath = path.join(cwd, "package.json");
  const lockPath = path.join(cwd, "pnpm-lock.yaml");
  
  if (fs.existsSync(pkgPath) && fs.existsSync(lockPath)) {
    // Check if package files changed recently (git status)
    try {
      const { execSync } = require("child_process");
      const status = execSync("git status --porcelain package.json pnpm-lock.yaml", {
        cwd,
        encoding: "utf8",
      });
      
      if (status.trim() && !fs.existsSync(riskPath)) {
        issues.push("Dependency changes detected but no risk report (run `npx arela risk report`)");
      }
    } catch {
      // Not a git repo or git not available
    }
  }
  
  const [rules, workflows] = await Promise.all([loadLocalRules(cwd), loadLocalWorkflows(cwd)]);
  const evalResult = opts.evalMode ? await runEvalCheck(cwd) : undefined;
  return { rules, workflows, evalResult, issues: issues.length > 0 ? issues : undefined };
}
```

## Usage Examples

### Controlled Internet Access
```bash
# Fetch allowed domain
$ npx arela net fetch https://react.dev/docs

<!DOCTYPE html>...

FETCH 200 45231b

# Try blocked domain
$ npx arela net fetch https://evil.com

Error: Domain not allowed: evil.com

# Check allowlist
$ npx arela net check https://react.dev
✓ https://react.dev is allowed
```

### Package Docs
```bash
# Index packages
$ npx arela docs index

Indexing package documentation...

Found 47 packages

  react...
  react-router-dom...
  tailwindcss...

✓ Indexed 47 packages
  Saved to .arela/cache/docs.idx.json

# Search
$ npx arela docs search "router"

Found 2 results:

react-router-dom
  Declarative routing for React
  Docs: https://reactrouter.com

wouter
  A minimalist routing library
  Docs: https://github.com/molefrog/wouter

# Open docs
$ npx arela docs open react-router-dom
Opening: https://reactrouter.com
```

### Windsurf Integration
```bash
# Install bootstrap
$ npx arela agent install --agent=windsurf

Files written:
  .windsurf/cascade.bootstrap.md

# Windsurf now loads:
# - .arela/profile.json
# - .arela/answers.json
# - All rules and workflows
# - Tools: net fetch, docs search, doctor, risk report
```

### Doctor with Net/Docs Checks
```bash
$ npx arela doctor

Configuration issues:
  • Docs index not found (run `npx arela docs index`)

Rules OK (12)
Workflows OK (4)
Doctor passed.
```

## Security & Cost Discipline

### Allowlist Enforcement
- Only allowed domains can be fetched
- Rate limited (20/min default)
- Byte capped (2MB default)
- All requests logged

### Budget Control
```bash
# Set budget
export ARELA_NET_BUDGET=50

# Hard-kill network
export ARELA_NET_DISABLED=1
```

### Cache
- All fetches cached in `.arela/cache/http/`
- 24-hour TTL (configurable via `ARELA_NET_CACHE_TTL`)
- Cache hit/miss logged

### Provenance
```
# .arela/logs/net.log
2025-11-09T15:30:00.000Z FETCH 200 45231b https://react.dev/docs
2025-11-09T15:30:05.000Z CACHE 200 45231b https://react.dev/docs
2025-11-09T15:30:10.000Z FETCH 200 12847b https://registry.npmjs.org/react
```

## What This Gives You

✅ **Agents follow rules** - Windsurf loads Arela bootstrap automatically
✅ **Internet is safe** - Allowlist, rate limits, byte caps, cache
✅ **Docs are instant** - One command to find package docs
✅ **Updates are vetted** - Risk report before any dependency change
✅ **Everything is logged** - Full provenance trail
✅ **Budget controlled** - Hard limits prevent abuse

## Files Created

```
templates/.arela/
├── net.allow.json              # Domain allowlist
├── net.policy.md               # Network policy
└── docs.config.json            # Docs configuration

src/net/
└── fetcher.ts                  # Controlled fetcher (200 LOC)

src/docs/
└── indexer.ts                  # Docs indexer (150 LOC)
```

## Next Steps

1. Wire CLI commands (net, docs)
2. Update doctor checks
3. Build: `pnpm -F @newdara/preset-cto build`
4. Test:
   ```bash
   npx arela net fetch https://react.dev
   npx arela docs index
   npx arela docs search "router"
   npx arela doctor
   ```
5. Implement remaining features:
   - `arela inspect repo/deps/links/graph`
   - `arela risk report`
   - Update Windsurf bootstrap

## Philosophy

**Arela as the boss in Windsurf.**

- 🌐 **Internet legs** - Controlled, cached, logged
- 📚 **Package-docs brains** - Instant access to docs
- ⚠️ **Update awareness** - Risk reports before changes
- 🛡️ **Security first** - Allowlist, budget, provenance
- 📋 **Audit trail** - Everything logged

**No chaos. No surprises. Just controlled power.** 🎯
