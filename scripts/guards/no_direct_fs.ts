
import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';

async function checkNoDirectFS() {
    const files = await glob('slices/**/*.ts', { ignore: ['**/ops.ts', '**/*.test.ts', '**/*.spec.ts', 'slices/fs/ops.ts'] });
    let failed = false;

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/import .* from ['"]fs-extra['"]/) || content.match(/import .* from ['"]fs['"]/)) {
            console.error(`❌ Violation in ${file}: Direct import of 'fs' or 'fs-extra'. Use 'slices/fs/ops.ts' instead.`);
            failed = true;
        }
    }

    if (failed) {
        process.exit(1);
    } else {
        console.log("✅ No direct FS usage found in feature slices.");
    }
}

checkNoDirectFS();
