import { promises as fs } from 'fs';
import glob from 'glob';
import path from 'path';

const checkForEvalUsage = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf-8');
    if (content.includes('eval(')) {
        console.error(`Violation found in file: ${filePath}`);
        return true;
    }
    return false;
};

const scanCodebase = async (pattern) => {
    return new Promise((resolve, reject) => {
        glob(pattern, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
};

const main = async () => {
    try {
        const files = await scanCodebase('**/*.js');
        const violations = await Promise.all(files.map(checkForEvalUsage));
        
        if (violations.includes(true)) {
            process.exit(1);
        }

        console.log('No violations found. Codebase quality is good.');
        process.exit(0);
    } catch (error) {
        console.error('Error scanning codebase:', error);
        process.exit(1);
    }
};

main();