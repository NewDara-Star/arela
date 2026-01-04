import fs from 'fs-extra';
import path from 'path';

const scratchpadPath = path.resolve(process.cwd(), 'SCRATCHPAD.md');
const maxAgeInMinutes = 15;

const checkScratchpadStale = async () => {
    try {
        const stats = await fs.stat(scratchpadPath);
        const modifiedTime = stats.mtime;
        const currentTime = new Date();

        const ageInMinutes = (currentTime - modifiedTime) / 1000 / 60;

        if (ageInMinutes > maxAgeInMinutes) {
            console.error(`Violation found: SCRATCHPAD.md is stale (last modified ${ageInMinutes.toFixed(2)} minutes ago).`);
            process.exit(1);
        } else {
            console.log('SCRATCHPAD.md is up to date.');
            process.exit(0);
        }
    } catch (error) {
        console.error('Error checking SCRATCHPAD.md:', error);
        process.exit(1);
    }
};

checkScratchpadStale();