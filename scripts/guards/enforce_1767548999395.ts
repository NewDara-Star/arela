import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

const targetDirectory = path.resolve(process.cwd(), 'src'); // Adjust the source directory as needed

const checkForDefaultExports = async () => {
    const files = await glob.sync('**/*.js', { cwd: targetDirectory, nodir: true });
    let hasViolation = false;

    for (const file of files) {
        const content = await fs.readFile(path.resolve(targetDirectory, file), 'utf-8');
        if (/export\s+default\s+/.test(content)) {
            console.error(`Violation found in file: ${file}`);
            hasViolation = true;
        }
    }

    return hasViolation;
};

const main = async () => {
    const hasViolation = await checkForDefaultExports();
    if (hasViolation) {
        process.exit(1);
    } else {
        process.exit(0);
    }
};

main();