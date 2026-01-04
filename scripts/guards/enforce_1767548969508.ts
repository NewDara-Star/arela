import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';

const MAX_LINES = 400;
const EXCLUDED_FILE = 'server.ts';
const ROOT_DIR = 'src';

const checkFileLines = async (filePath) => {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lineCount = fileContent.split('\n').length;

    if (lineCount > MAX_LINES) {
        return `Error: File "${filePath}" exceeds ${MAX_LINES} lines (${lineCount} lines).`;
    }
    return null;
};

const scanCodebase = async () => {
    const pattern = path.join(ROOT_DIR, '**/*.ts');
    const files = glob.sync(pattern);

    const violations = [];

    for (const file of files) {
        if (path.basename(file) === EXCLUDED_FILE) {
            continue;
        }
        const violationMessage = await checkFileLines(file);
        if (violationMessage) {
            violations.push(violationMessage);
        }
    }

    return violations;
};

const run = async () => {
    const violations = await scanCodebase();
    
    if (violations.length > 0) {
        console.error(violations.join('\n'));
        process.exit(1);
    }
    
    console.log('All files comply with the line limit.');
    process.exit(0);
};

run();