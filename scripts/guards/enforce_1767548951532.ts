import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

const searchPattern = 'src/**/*.js'; // Adjust the pattern based on your file types
const violationMessage = "Error: Found 'console.log' in production code!";

async function checkForConsoleLogs() {
    return new Promise((resolve, reject) => {
        glob(searchPattern, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files);
        });
    });
}

function checkFileForConsoleLog(file) {
    const content = fs.readFileSync(file, 'utf-8');
    return content.includes('console.log');
}

async function main() {
    try {
        const files = await checkForConsoleLogs();
        for (const file of files) {
            if (checkFileForConsoleLog(file)) {
                console.error(violationMessage);
                console.error(`Found in: ${file}`);
                process.exit(1);
            }
        }
        console.log("No violations found.");
        process.exit(0);
    } catch (error) {
        console.error(`Error during scanning: ${error.message}`);
        process.exit(1);
    }
}

main();