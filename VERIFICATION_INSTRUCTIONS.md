# Session Guard Verification

Due to environment restrictions preventing command execution, please run the verification manually.

## 1. Build the Project
Ensure the new slices are compiled.

```bash
rm -rf dist
npm run build
```

**Check:** Verify `dist/slices/guard` and `dist/slices/fs` exist.

## 2. Run the Verification Script
This script tests the full flow:
1. Blocks illegal writes in `DISCOVERY`
2. Transitions via `symptom` -> `hypothesis` -> `confirm`
3. Allows writes in `IMPLEMENTATION`

```bash
# Option A: Run using tsx (Recommended)
npx tsx scripts/test_guard.ts

# Option B: Run using node (requires build)
node scripts/test_guard.js
```

## 3. Verify Documentation
Run the documentation site locally to see the new `Guard` page.

```bash
npm run docs:dev
```

Open `http://localhost:5173/arela/tools/guard.html`.
