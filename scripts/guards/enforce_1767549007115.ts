import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';

const searchStrings = ['bearer', 'token', 'key'];

const scanFileForSecrets = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf-8');
    for (const searchString of searchStrings) {
        const regex = new RegExp(`\\b${searchString}\\b\\s*=\\s*['"]([^'"]*)['"]`, 'g');
        const matches = content.match(regex);
        if (matches) {
            return matches;
        }
    }
    return null;
};

const scanCodebase = async (directory) => {
    const pattern = path.join(directory, '**', '*.{js,ts,jsx,tsx}');
    const files = glob.sync(pattern);

    for (const filePath of files) {
        const violations = await scanFileForSecrets(filePath);
        if (violations) {
            console.error(`Violation found in file: ${filePath}`);
            violations.forEach(violation => console.error(`  - ${violation}`));
            return 1; // Exit with code 1 if any violation is found
        }
    }
    return 0; // Exit with code 0 if no violations are found
};

const main = async () => {
    const codebaseDir = path.resolve(process.cwd(), 'src'); // Change 'src' to your codebase directory
    const exitCode = await scanCodebase(codebaseDir);
    process.exit(exitCode);
};

main();