import { promises as fs } from 'fs';
import path from 'path';

const TARGET_FILE = 'SCRATCHPAD.md';

async function checkForScratchpad() {
    const files = await fs.readdir(process.cwd());
    const hasScratchpad = files.includes(TARGET_FILE);
    
    if (!hasScratchpad) {
        console.error(`Error: '${TARGET_FILE}' must exist`);
        process.exit(1);
    } else {
        console.log(`All good: '${TARGET_FILE}' is present`);
        process.exit(0);
    }
}

checkForScratchpad().catch(err => {
    console.error(`Unexpected error: ${err.message}`);
    process.exit(1);
});