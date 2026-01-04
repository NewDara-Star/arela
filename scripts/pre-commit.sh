#!/bin/sh
#
# Pre-commit hook: SCRATCHPAD Update Reminder
# 
# Install: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
#

SCRATCHPAD_MODIFIED=$(git diff --cached --name-only | grep -c "SCRATCHPAD.md" || true)
STAGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')
CODE_FILES=$(git diff --cached --name-only | grep -E '\.(ts|js)$' | wc -l | tr -d ' ')

if [ "$STAGED_FILES" -gt 3 ] || [ "$CODE_FILES" -gt 0 ]; then
    if [ "$SCRATCHPAD_MODIFIED" -eq 0 ]; then
        echo ""
        echo "⚠️  SCRATCHPAD REMINDER"
        echo "════════════════════════════════════════"
        echo "You're committing $STAGED_FILES files ($CODE_FILES code files)"
        echo "but SCRATCHPAD.md was NOT updated."
        echo ""
        echo "Rule: Update SCRATCHPAD.md after significant work."
        echo "To skip: git commit --no-verify"
        echo "════════════════════════════════════════"
        echo ""
    fi
fi

# Auto-sync AGENTS.md to GEMINI.md if AGENTS.md was modified
AGENTS_MODIFIED=$(git diff --cached --name-only | grep -c "AGENTS.md" || true)
if [ "$AGENTS_MODIFIED" -gt 0 ]; then
    GEMINI_PATH="$HOME/.gemini/GEMINI.md"
    if [ -d "$(dirname "$GEMINI_PATH")" ]; then
        cp AGENTS.md "$GEMINI_PATH"
        echo "✅ AGENTS.md synced to $GEMINI_PATH"
    fi
fi

exit 0
