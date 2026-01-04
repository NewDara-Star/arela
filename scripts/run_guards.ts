
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

const guardsDir = path.join(process.cwd(), 'scripts/guards');

async function runGuards() {
    console.log("🛡️  Running All Guards...");

    if (!await fs.pathExists(guardsDir)) {
        console.error("❌ No guards directory found.");
        process.exit(1);
    }

    const files = await fs.readdir(guardsDir);
    const guardFiles = files.filter(f => f.endsWith('.ts'));

    if (guardFiles.length === 0) {
        console.warn("⚠️  No guards found to run.");
        return;
    }

    let passed = 0;
    let failed = 0;

    for (const file of guardFiles) {
        const filePath = path.join(guardsDir, file);
        process.stdout.write(`running ${file}... `);
        try {
            await execa('npx', ['tsx', filePath], { stdio: 'inherit' });
            // If exit code 0, it passed (stdio inherit might mess up line cleaness but that's ok)
            console.log(`✅`);
            passed++;
        } catch (error) {
            console.log(`❌ FAILED`);
            failed++;
        }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runGuards();
