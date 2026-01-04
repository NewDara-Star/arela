import { promises as fs } from 'fs';
import glob from 'fast-glob';

const checkForHardcodedPaths = async () => {
    const pattern = '**/*.js'; // Adjust the pattern as necessary for your codebase
    const files = await glob(pattern);

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('/Users/')) {
            console.error(`Violation found in file: ${file}`);
            process.exit(1);
        }
    }

    console.log('No hardcoded absolute paths found.');
    process.exit(0);
};

checkForHardcodedPaths().catch(error => {
    console.error(error);
    process.exit(1);
});