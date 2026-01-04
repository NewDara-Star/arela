import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slicesDir = path.join(__dirname, '../../slices');

// Function to check for README.md in slices
const checkReadmeFiles = async () => {
    try {
        const entries = await fs.readdir(slicesDir);

        for (const entry of entries) {
            const entryPath = path.join(slicesDir, entry);
            const stat = await fs.stat(entryPath);

            if (stat.isDirectory() && entry !== 'shared') {
                const readmePath = path.join(entryPath, 'README.md');
                const exists = await fs.pathExists(readmePath);

                if (!exists) {
                    console.error(`Missing README.md in slice: ${entry}`);
                    process.exit(1); // Exit with code 1 if a violation is found
                }
            }
        }

        console.log('All slices have README.md files.');
        process.exit(0); // Exit with code 0 if all checks pass

    } catch (error) {
        console.error('Error reading slices:', error);
        process.exit(1);
    }
};

// Run the check
checkReadmeFiles();