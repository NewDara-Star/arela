
import { generateGuard } from '../slices/enforce/ops.js';
import path from 'path';

const projectPath = process.cwd();

const enforcers = [
    // --- CODE QUALITY (1-5) ---
    { issue: "Console logs in production code", solution: "Fail if `console.log` is found in `src/` (excluding CLI)." },
    { issue: "Usage of `any` type", solution: "Fail if `: any` is found in `src/` files." },
    { issue: "No TODOs without ticket numbers", solution: "Fail if `TODO` exists without `(Issue #`." },
    { issue: "Files too large (>400 lines)", solution: "Fail if any `.ts` file in `src/` exceeds 400 lines (except server.ts which we handled)." },
    { issue: "No deeply nested imports", solution: "Fail if `import` paths contain more than 3 `../` (e.g. `../../../../`)." },

    // --- ARCHITECTURE (6-10) ---
    { issue: "Slices must have README", solution: "Fail if any directory in `slices/` writes code but lacks `README.md`." },
    { issue: "No circular imports", solution: "Fail if a file imports itself or a cycle is detected (simple regex check for now)." },
    { issue: "No v4 legacy code", solution: "Fail if `v4` or `legacy` string appears in `src/`." },
    { issue: "Explicit Exports Only", solution: "Fail if files use `export default` (prefer named exports)." },
    { issue: "No hardcoded absolute paths", solution: "Fail if code contains `/Users/` literals." },

    // --- SECURITY (11-15) ---
    { issue: "No secrets in code", solution: "Fail if `bearer`, `token`, or `key` literals are assigned strings (simple heuristic)." },
    { issue: "No process.exit in libraries", solution: "Fail if `process.exit` is used outside of `src/cli.ts` or `scripts/`." },
    { issue: "No eval()", solution: "Fail if `eval(` is used." },
    { issue: "No child_process exec without array", solution: "Warn if `exec(` is used (prefer `execFile` or `spawn` with args array)." },
    { issue: "Dependencies must be pinned", solution: "Fail if `package.json` uses `^` or `~` (strict versions)." },

    // --- PROCESS (16-20) ---
    { issue: "AGENTS.md must exist", solution: "Fail if `AGENTS.md` is missing." },
    { issue: "SCRATCHPAD.md must exist", solution: "Fail if `SCRATCHPAD.md` is missing." },
    { issue: "Tests must exist for slices", solution: "Warn if `slices/` subdirs don't have corresponding `tests/` entries." },
    { issue: "No empty catch blocks", solution: "Fail if `catch (e) {}` or `catch {}` is found empty." },
    { issue: "Filenames must be snake_case", solution: "Fail if new filenames use CamelCase (prefer snake_case or kebab-case)." },
];

async function run() {
    console.log(`🛡️ Building ${enforcers.length} Enforcers...`);

    for (const [i, e] of enforcers.entries()) {
        console.log(`[${i + 1}/${enforcers.length}] Creating guard for: ${e.issue}...`);
        try {
            await generateGuard(projectPath, e.issue, e.solution);
        } catch (err) {
            console.error(`❌ Failed to create guard ${i + 1}:`, err);
        }
    }
    console.log("✅ All guards created.");
}

run();
