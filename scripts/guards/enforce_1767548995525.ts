import fs from 'fs-extra';
import { glob } from 'glob';

const checkForLegacyCode = async () => {
    const pattern = 'src/**/*.js'; // Adjust the pattern if needed for other file types
    const files = await new Promise((resolve, reject) => {
        glob(pattern, {}, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files);
        });
    });

    const violations = [];
    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('v4') || content.includes('legacy')) {
            violations.push(file);
        }
    }

    if (violations.length > 0) {
        console.error('Violation found in the following files:');
        violations.forEach(file => console.error(` - ${file}`));
        process.exit(1);
    }

    console.log('No violations found. Codebase is clean.');
    process.exit(0);
};

checkForLegacyCode();