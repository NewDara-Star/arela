import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';

const checkTodosWithoutTicketNumber = async (directory) => {
    const files = glob.sync(`${directory}/**/*.{js,ts}`, { nodir: true });
    const violations = [];

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const regex = /TODO(?!.*\(Issue #)/g; // Matches TODOs that do not have (Issue #
        const matches = content.match(regex);
        
        if (matches) {
            violations.push({ file, count: matches.length });
        }
    }

    return violations;
};

const run = async () => {
    const directory = process.cwd(); // Change this if you want to scan a specific directory
    const violations = await checkTodosWithoutTicketNumber(directory);
    
    if (violations.length > 0) {
        console.error('Found TODOs without ticket numbers:');
        violations.forEach(violation => {
            console.error(`File: ${violation.file}, Count: ${violation.count}`);
        });
        process.exit(1);
    } else {
        console.log('No TODOs without ticket numbers found. All good!');
        process.exit(0);
    }
};

run();