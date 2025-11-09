#!/usr/bin/env bash
# Arela Bootstrap One-Liner
# Usage: curl -fsSL https://raw.githubusercontent.com/newdara/preset-cto/main/scripts/bootstrap.sh | bash
# Or: bash scripts/bootstrap.sh

set -e

echo "🚀 Arela Bootstrap"
echo ""

# Detect package manager
if command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PM="npm"
else
  PM="yarn"
fi
echo "✓ Detected package manager: $PM"

# Ensure git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "⚠ Not a git repository. Initializing..."
  git init
  git add .
  git commit -m "chore: repo init" || true
fi
echo "✓ Git repository ready"

# Install preset
echo "📦 Installing @newdara/preset-cto..."
$PM add -D @newdara/preset-cto@latest

# Handle pnpm builds
if [ "$PM" = "pnpm" ]; then
  echo "🔐 Approving pnpm builds..."
  $PM approve-builds @newdara/preset-cto || true
  $PM rebuild || true
fi

# Run arela init
echo "📋 Running arela init..."
npx arela init

# Install Husky if missing
if ! command -v husky >/dev/null 2>&1 && [ ! -d .husky ]; then
  echo "🪝 Installing Husky..."
  $PM dlx husky-init
  $PM install
fi

# Run arela harden
echo "🛡️ Running arela harden..."
npx arela harden

# Ensure profile and rubric
mkdir -p .arela/evals

if [ ! -f .arela/profile.json ]; then
  echo "📝 Creating .arela/profile.json..."
  printf '{"persona":"cto","tone":"direct","humour":"dry","locale":"en-GB"}\n' > .arela/profile.json
fi

if [ ! -f .arela/evals/rubric.json ]; then
  echo "📊 Creating .arela/evals/rubric.json..."
  if [ -f node_modules/@newdara/preset-cto/templates/.arela/evals/rubric.json ]; then
    cp node_modules/@newdara/preset-cto/templates/.arela/evals/rubric.json .arela/evals/rubric.json
  else
    printf '{"thresholds":{"minPass":3.5,"avgPass":4.0},"categories":[{"name":"Context Integrity","weight":1.0},{"name":"Testing Coverage","weight":1.0},{"name":"Observability","weight":1.0},{"name":"Code Review Gates","weight":1.0}]}\n' > .arela/evals/rubric.json
  fi
fi

# Run doctor baseline
echo "🩺 Running doctor --eval..."
npx arela doctor --eval > .arela/.last-report.json || true

# Update gitignore
if [ -f .gitignore ]; then
  if ! grep -q ".arela/.last-report.json" .gitignore; then
    echo "" >> .gitignore
    echo ".arela/.last-report.json" >> .gitignore
  fi
else
  echo ".arela/.last-report.json" > .gitignore
fi

# Commit changes
echo "💾 Committing changes..."
git add .arela .husky .github .vscode package.json .gitignore 2>/dev/null || true
git commit -m "chore(arela): setup rules, hooks, CI, baseline" || true

echo ""
echo "✅ Arela setup complete!"
echo ""
echo "Your repository now has:"
echo "  • Rules and workflows in .arela/"
echo "  • Pre-commit hooks via Husky"
echo "  • GitHub Actions CI workflow"
echo "  • Baseline evaluation report"
echo ""
echo "Run 'npx arela doctor --eval' anytime to check compliance."
echo ""
