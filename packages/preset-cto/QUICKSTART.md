# Arela Quick Start

## One Command Setup

```bash
npx @newdara/preset-cto@latest setup
```

That's it. The wizard handles everything: rules, hooks, CI, RAG, **and learning system**.

## What You Get

```
~/.arela/                      # Global (NEW in v1.1.0)
├── config.json                # Learning data, patterns
└── custom-rules/              # Your custom rules

.arela/
├── rules/                     # 21 CTO rules
├── workflows/                 # 9 workflows
├── hooks/                     # Auto-activation hooks (NEW in v1.0.0)
├── skill-rules.json           # Activation triggers (NEW in v1.0.0)
├── profile.json               # Agent persona config
├── evals/
│   └── rubric.json           # Quality evaluation criteria
└── .last-report.json         # Baseline report (gitignored)

.husky/
└── pre-commit                # Runs doctor --eval before commits

.github/workflows/
└── arela-doctor.yml          # CI validation

.vscode/
└── settings.json             # Optimized search patterns
```

## Fast Flags

```bash
# Accept all defaults
npx @newdara/preset-cto@latest setup --yes

# CI mode (non-interactive)
npx @newdara/preset-cto@latest setup --non-interactive --yes --skip-rag

# Skip optional steps
npx @newdara/preset-cto@latest setup --skip-rag --skip-ci --skip-hooks
```

## Verify Setup

```bash
# Check rules and workflows
npx arela doctor

# Check with evaluation
npx arela doctor --eval

# Test pre-commit hook
git add .
git commit -m "test: verify arela hooks"
```

## Common Commands

### Core Commands
```bash
# Check rules and workflows
npx arela doctor

# Sync preset updates
npx arela sync

# Three-way merge upgrade
npx arela upgrade
```

### Learning System (v1.1.0+)
```bash
# View learned patterns
npx arela patterns

# Check for updates
npx arela check-updates

# Sync updates + patterns
npx arela sync

# Share with team
npx arela export-patterns
npx arela import-patterns --file team-patterns.json

# List all projects
npx arela projects
```

### RAG System (v0.5.0+)
```bash
# Build semantic index
npx arela index

# Start RAG server
npx arela serve

# Search codebase
npx arela search "authentication logic"
```

### Agent Integration
```bash
# Get agent bootstrap prompt
npx arela agent bootstrap

# Install agent assets
npx arela agent install --agent windsurf
```

## Troubleshooting

### pnpm blocks postinstall?

```bash
pnpm approve-builds @newdara/preset-cto
pnpm rebuild
```

The setup command handles this automatically.

### Hook not executable?

```bash
chmod +x .husky/pre-commit
```

The setup command sets this automatically.

### Want to re-run setup?

It's idempotent. Just run it again:

```bash
npx @newdara/preset-cto setup
```

## Shell One-Liner

For curl-pipe-bash fans:

```bash
curl -fsSL https://raw.githubusercontent.com/newdara/preset-cto/main/scripts/bootstrap.sh | bash
```

Or download and run:

```bash
curl -fsSL https://raw.githubusercontent.com/newdara/preset-cto/main/scripts/bootstrap.sh -o bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh
```

## Next Steps

1. **Configure IDE** - Run `npx arela agent install --agent windsurf`
2. **Customize rules** - Edit `.arela/rules/` for your team
3. **Set preferences** - Update `.arela/profile.json`
4. **Adjust thresholds** - Edit `.arela/evals/rubric.json`
5. **Start RAG** - Run `npx arela serve` for semantic search
6. **Let it learn** - Arela tracks violations and learns patterns
7. **Share patterns** - Export patterns for your team

## Philosophy

- **One command** - No 12-step choreography
- **Interactive** - Prompts keep it human
- **Scriptable** - Flags keep it automatable
- **Idempotent** - Safe to re-run
- **Transparent** - Clear feedback at every step

## Documentation

- [README.md](./README.md) - Overview and learning system
- [SETUP.md](./SETUP.md) - Complete setup guide
- [GETTING-STARTED.md](./GETTING-STARTED.md) - For non-technical users
- [AUTO-ACTIVATION.md](./AUTO-ACTIVATION.md) - Auto-activation system
- [BROWSER-AUTOMATION.md](./BROWSER-AUTOMATION.md) - QA testing guide
- [RAG.md](./RAG.md) - Local semantic search
- [CHANGELOG.md](./CHANGELOG.md) - Version history

---

**Ship it.** 🚀
