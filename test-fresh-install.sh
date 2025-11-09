#!/usr/bin/env bash
# Test Arela setup in a fresh repository

set -e

echo "🧪 Testing Arela Fresh Install"
echo ""

# Create temp directory
TEST_DIR="/tmp/arela-test-$(date +%s)"
echo "📁 Creating test directory: $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize git
echo "🔧 Initializing git..."
git init
git config user.email "test@example.com"
git config user.name "Test User"

# Create a basic package.json
echo "📦 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "arela-test",
  "version": "1.0.0",
  "description": "Testing Arela setup",
  "private": true
}
EOF

# Run Arela setup
echo ""
echo "🚀 Running Arela setup..."
echo ""
npx @newdara/preset-cto@latest setup --yes --skip-rag

# Verify installation
echo ""
echo "✅ Verifying installation..."
echo ""

# Check .arela directory
if [ -d ".arela" ]; then
  echo "✓ .arela/ directory created"
  echo "  Rules: $(ls .arela/rules/ | wc -l | tr -d ' ')"
  echo "  Workflows: $(ls .arela/workflows/ | wc -l | tr -d ' ')"
else
  echo "✗ .arela/ directory missing"
  exit 1
fi

# Check Husky
if [ -d ".husky" ]; then
  echo "✓ .husky/ directory created"
  if [ -f ".husky/pre-commit" ]; then
    echo "  pre-commit hook exists"
  fi
else
  echo "✗ .husky/ directory missing"
  exit 1
fi

# Check GitHub Actions
if [ -f ".github/workflows/arela-doctor.yml" ]; then
  echo "✓ GitHub Actions workflow created"
else
  echo "✗ GitHub Actions workflow missing"
  exit 1
fi

# Check profile and rubric
if [ -f ".arela/profile.json" ]; then
  echo "✓ .arela/profile.json created"
else
  echo "✗ .arela/profile.json missing"
fi

if [ -f ".arela/evals/rubric.json" ]; then
  echo "✓ .arela/evals/rubric.json created"
else
  echo "✗ .arela/evals/rubric.json missing"
fi

# Run doctor
echo ""
echo "🩺 Running arela doctor..."
npx arela doctor

echo ""
echo "✅ All tests passed!"
echo ""
echo "Test directory: $TEST_DIR"
echo "To inspect: cd $TEST_DIR"
echo "To cleanup: rm -rf $TEST_DIR"
