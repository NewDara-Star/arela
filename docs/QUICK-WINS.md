# Quick Wins for v1.7.0

**Target:** Ship in 1-2 days each  
**Total Time:** ~1 week for all 5  
**Impact:** Massive UX improvement

---

## 1. CLI RAG Search (Priority: HIGH)

**Problem:** Need curl to query RAG server

**Solution:**
```bash
npx arela search "ticket format" --top 3
```

**Implementation:**
```typescript
// src/cli.ts
program
  .command('search <query>')
  .option('--top <n>', 'Number of results', '5')
  .option('--json', 'Output as JSON')
  .action(async (query, opts) => {
    const results = await searchRAG(query, {
      top: parseInt(opts.top),
      ragUrl: process.env.RAG_URL || 'http://localhost:3456'
    });
    
    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      formatSearchResults(results);
    }
  });
```

**Files to modify:**
- `src/cli.ts` - Add search command
- `src/rag/search.ts` - Add search function
- `src/rag/format.ts` - Format results nicely

**Time:** 2-3 hours

---

## 2. Structure Validation (Priority: HIGH)

**Problem:** Tickets in wrong location, no validation

**Solution:**
```bash
npx arela doctor --check-structure
npx arela doctor --fix
```

**Implementation:**
```typescript
// src/doctor.ts
async function checkStructure(cwd: string) {
  const issues: Issue[] = [];
  
  // Check for tickets in wrong location
  const wrongTickets = await glob('docs/tickets/**/*.md', { cwd });
  if (wrongTickets.length > 0) {
    issues.push({
      type: 'error',
      message: `Found ${wrongTickets.length} tickets in docs/tickets/, should be in .arela/tickets/`,
      fix: 'Move tickets to .arela/tickets/'
    });
  }
  
  // Check for IDE rules
  const ideRules = ['.windsurfrules', '.cursorrules', '.clinerules'];
  for (const rule of ideRules) {
    if (!fs.existsSync(path.join(cwd, rule))) {
      issues.push({
        type: 'warning',
        message: `Missing ${rule}`,
        fix: `Create ${rule} with: npx arela init --create-ide-rules`
      });
    }
  }
  
  // Check for .arela directory
  if (!fs.existsSync(path.join(cwd, '.arela'))) {
    issues.push({
      type: 'error',
      message: 'Missing .arela directory',
      fix: 'Run: npx arela init'
    });
  }
  
  return issues;
}

async function fixStructure(cwd: string, issues: Issue[]) {
  for (const issue of issues) {
    if (issue.type === 'error' && issue.message.includes('tickets')) {
      // Move tickets
      const wrongTickets = await glob('docs/tickets/**/*.md', { cwd });
      for (const ticket of wrongTickets) {
        const dest = ticket.replace('docs/tickets/', '.arela/tickets/');
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        await fs.promises.rename(ticket, dest);
      }
      console.log(`✅ Moved ${wrongTickets.length} tickets to .arela/tickets/`);
    }
  }
}
```

**Files to modify:**
- `src/doctor.ts` - Add structure checking
- Add `--check-structure` flag
- Add `--fix` flag

**Time:** 3-4 hours

---

## 3. IDE Setup Automation (Priority: HIGH)

**Problem:** Manual `.windsurfrules` creation

**Solution:**
```bash
npx arela init --create-ide-rules
npx arela setup --ide windsurf
```

**Implementation:**
```typescript
// src/ide-setup.ts
export async function createIDERules(cwd: string, ide?: string) {
  const ides = ide ? [ide] : ['windsurf', 'cursor', 'cline'];
  
  for (const ideName of ides) {
    const ruleFile = IDE_RULE_FILES[ideName];
    const template = await loadTemplate(`ide/${ruleFile}`);
    
    const dest = path.join(cwd, ruleFile);
    if (fs.existsSync(dest)) {
      console.log(`⚠️  ${ruleFile} already exists, skipping`);
      continue;
    }
    
    await fs.promises.writeFile(dest, template);
    console.log(`✅ Created ${ruleFile}`);
  }
}

const IDE_RULE_FILES = {
  windsurf: '.windsurfrules',
  cursor: '.cursorrules',
  cline: '.clinerules'
};
```

**Templates to create:**
- `templates/ide/.windsurfrules`
- `templates/ide/.cursorrules`
- `templates/ide/.clinerules`

**Files to modify:**
- `src/cli.ts` - Add `--create-ide-rules` flag
- `src/ide-setup.ts` - New file
- `src/setup.ts` - Integrate IDE setup

**Time:** 2-3 hours

---

## 4. Sequential Indexing Default (Priority: MEDIUM)

**Problem:** Parallel indexing is slow, no warning

**Solution:**
```bash
# Default: sequential (fast)
npx arela index

# Opt-in to parallel
npx arela index --parallel
```

**Implementation:**
```typescript
// src/rag/index.ts
export async function indexFiles(
  files: string[],
  options: {
    parallel?: boolean;
    progress?: boolean;
  } = {}
) {
  const { parallel = false, progress = false } = options;
  
  if (parallel) {
    console.log('⚠️  Parallel indexing is slower but uses less memory');
    return indexParallel(files, { progress });
  }
  
  return indexSequential(files, { progress });
}
```

**Files to modify:**
- `src/rag/index.ts` - Change default
- `src/cli.ts` - Add `--parallel` flag
- Update documentation

**Time:** 1 hour

---

## 5. Progress Bars (Priority: MEDIUM)

**Problem:** No feedback during indexing

**Solution:**
```bash
npx arela index --progress
# [████████░░] 80% (2946/3683) - ETA: 2m 15s
```

**Implementation:**
```typescript
// src/utils/progress.ts
import cliProgress from 'cli-progress';

export class ProgressBar {
  private bar: cliProgress.SingleBar;
  
  constructor(total: number) {
    this.bar = new cliProgress.SingleBar({
      format: '[{bar}] {percentage}% ({value}/{total}) - ETA: {eta_formatted}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
    });
    this.bar.start(total, 0);
  }
  
  update(current: number) {
    this.bar.update(current);
  }
  
  stop() {
    this.bar.stop();
  }
}

// Usage in indexing
const progress = new ProgressBar(files.length);
for (let i = 0; i < files.length; i++) {
  await indexFile(files[i]);
  progress.update(i + 1);
}
progress.stop();
```

**Dependencies to add:**
```bash
pnpm add cli-progress
pnpm add -D @types/cli-progress
```

**Files to modify:**
- `src/utils/progress.ts` - New file
- `src/rag/index.ts` - Add progress tracking
- `package.json` - Add dependency

**Time:** 2 hours

---

## Implementation Order

### Day 1 (4-5 hours)
1. ✅ Sequential indexing default (1h)
2. ✅ Progress bars (2h)
3. ✅ CLI RAG search (2h)

### Day 2 (5-6 hours)
4. ✅ Structure validation (3-4h)
5. ✅ IDE setup automation (2-3h)

### Day 3 (2-3 hours)
6. ✅ Testing all features
7. ✅ Documentation updates
8. ✅ Build and publish v1.7.0

---

## Testing Checklist

### CLI RAG Search
- [ ] Search returns relevant results
- [ ] `--top` flag works
- [ ] `--json` flag outputs valid JSON
- [ ] Handles RAG server not running
- [ ] Error messages are clear

### Structure Validation
- [ ] Detects tickets in wrong location
- [ ] Detects missing IDE rules
- [ ] Detects missing .arela directory
- [ ] `--fix` moves tickets correctly
- [ ] Doesn't break existing structure

### IDE Setup
- [ ] Creates .windsurfrules
- [ ] Creates .cursorrules
- [ ] Creates .clinerules
- [ ] Doesn't overwrite existing files
- [ ] Templates are valid

### Sequential Indexing
- [ ] Default is sequential
- [ ] `--parallel` flag works
- [ ] Sequential is faster
- [ ] Both produce same results

### Progress Bars
- [ ] Shows during indexing
- [ ] Updates correctly
- [ ] Shows ETA
- [ ] Cleans up on completion
- [ ] Works with both sequential and parallel

---

## Documentation Updates

### README.md
```markdown
## Quick Start

# Install
npm install -g @newdara/preset-cto

# Initialize project
npx arela init --create-ide-rules

# Check structure
npx arela doctor --check-structure

# Search codebase
npx arela search "ticket format"

# Index with progress
npx arela index --progress
```

### CLI Help
```bash
npx arela --help

Commands:
  search <query>     Search codebase using RAG
  doctor             Check project health
  init               Initialize Arela in project
  index              Index codebase for RAG search
  
Options:
  --create-ide-rules  Create IDE rule files
  --check-structure   Validate project structure
  --fix               Auto-fix structure issues
  --progress          Show progress bar
  --parallel          Use parallel indexing (slower)
```

---

## Success Metrics

### Before v1.7.0
- Setup time: 10+ minutes
- Structure errors: Common
- RAG queries: curl only
- Indexing: No feedback

### After v1.7.0
- Setup time: < 2 minutes ✅
- Structure errors: Auto-detected & fixed ✅
- RAG queries: CLI-first ✅
- Indexing: Real-time progress ✅

---

## Ship It! 🚀

Total time: ~3 days
Impact: Massive UX improvement
Risk: Low (all additive features)

**Ready to ship v1.7.0!**
