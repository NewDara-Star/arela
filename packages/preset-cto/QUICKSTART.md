# Arela Quick Start

## One Command Setup

```bash
npx @newdara/preset-cto setup
```

That's it. The wizard handles everything.

## What You Get

```
.arela/
├── rules/              # Engineering discipline rules
├── workflows/          # Agent workflow prompts
├── profile.json        # Agent persona config
├── evals/
│   └── rubric.json    # Quality evaluation criteria
└── .last-report.json  # Baseline report (gitignored)

.husky/
└── pre-commit         # Runs doctor --eval before commits

.github/workflows/
└── arela-doctor.yml   # CI validation

.vscode/
└── settings.json      # Optimized search patterns
```

## Fast Flags

```bash
# Accept all defaults
npx @newdara/preset-cto setup --yes

# CI mode (non-interactive)
npx @newdara/preset-cto setup --non-interactive --yes --skip-rag

# Skip optional steps
npx @newdara/preset-cto setup --skip-rag --skip-ci --skip-hooks
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

```bash
# Sync preset updates
npx arela sync

# Three-way merge upgrade
npx arela upgrade

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

1. Customize `.arela/rules/` for your team
2. Update `.arela/profile.json` with your preferences
3. Adjust `.arela/evals/rubric.json` thresholds
4. Copy agent bootstrap prompt to your IDE
5. Start building with discipline

## Philosophy

- **One command** - No 12-step choreography
- **Interactive** - Prompts keep it human
- **Scriptable** - Flags keep it automatable
- **Idempotent** - Safe to re-run
- **Transparent** - Clear feedback at every step

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide
- [README.md](./README.md) - Full preset documentation
- [CHANGELOG.md](./CHANGELOG.md) - Version history

---

**Ship it.** 🚀
