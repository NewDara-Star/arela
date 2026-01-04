#!/bin/bash
#
# Test: Verify pre-commit hook is installed and works correctly
#

set -e

echo "🧪 Testing pre-commit hook setup..."

# Test 1: Hook file exists
if [ -f ".git/hooks/pre-commit" ]; then
    echo "✅ PASS: .git/hooks/pre-commit exists"
else
    echo "❌ FAIL: .git/hooks/pre-commit does not exist"
    exit 1
fi

# Test 2: Hook file is executable
if [ -x ".git/hooks/pre-commit" ]; then
    echo "✅ PASS: .git/hooks/pre-commit is executable"
else
    echo "❌ FAIL: .git/hooks/pre-commit is not executable"
    exit 1
fi

# Test 3: Hook file contains AGENTS.md sync logic
if grep -q "AGENTS.md" .git/hooks/pre-commit; then
    echo "✅ PASS: Hook contains AGENTS.md sync logic"
else
    echo "❌ FAIL: Hook does not contain AGENTS.md sync logic"
    exit 1
fi

# Test 4: Hook file contains GEMINI.md sync logic
if grep -q "GEMINI.md" .git/hooks/pre-commit; then
    echo "✅ PASS: Hook contains GEMINI.md sync"
else
    echo "❌ FAIL: Hook does not contain GEMINI.md sync"
    exit 1
fi

# Test 5: GEMINI.md is in sync with AGENTS.md
GEMINI_PATH="$HOME/.gemini/GEMINI.md"
if [ -f "$GEMINI_PATH" ]; then
    if diff -q AGENTS.md "$GEMINI_PATH" > /dev/null 2>&1; then
        echo "✅ PASS: AGENTS.md and GEMINI.md are in sync"
    else
        echo "⚠️  WARNING: AGENTS.md and GEMINI.md differ"
        echo "   Run: cp AGENTS.md ~/.gemini/GEMINI.md"
    fi
else
    echo "⚠️  WARNING: $GEMINI_PATH does not exist"
fi

echo ""
echo "🎉 Pre-commit hook tests completed!"
