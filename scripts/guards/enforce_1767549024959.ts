import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

const scanCodebase = async (directory) => {
    return new Promise((resolve, reject) => {
        glob(`${directory}/**/*.{js,ts}`, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files);
        });
    });
};

const checkForExecUsage = async (files) => {
    const execRegex = /child_process\.exec\s*\(\s*[^[]/; // checks for exec without an array

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (execRegex.test(content)) {
            console.error(`Violation found in file: ${file}`);
            return true;
        }
    }
    return false;
};

const main = async () => {
    const codebaseDir = path.resolve(process.cwd()); // Adjust if needed
    const files = await scanCodebase(codebaseDir);

    const hasViolation = await checkForExecUsage(files);
    if (hasViolation) {
        process.exit(1);
    } else {
        console.log('All good, no violations found.');
        process.exit(0);
    }
};

main().catch((error) => {
    console.error('Error during scanning:', error);
    process.exit(1);
});