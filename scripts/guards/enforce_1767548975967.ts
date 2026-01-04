import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';

const MAX_NESTED_IMPORTS = 3;

async function checkImports(directory) {
    const filePattern = path.join(directory, '**/*.js'); // Adjust extension as needed
    const files = await new Promise((resolve, reject) => {
        glob(filePattern, (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
        });
    });

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const importLines = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];

        for (const line of importLines) {
            const match = line.match(/['"]([^'"]+)['"]/);
            if (match) {
                const importPath = match[1];
                const relativePathMatch = importPath.match(/(\.\.\/)+/g);
                
                if (relativePathMatch && relativePathMatch.length > MAX_NESTED_IMPORTS) {
                    console.error(`Violation found in ${file}: ${line}`);
                    process.exit(1);
                }
            }
        }
    }
    console.log('No violations found.');
    process.exit(0);
}

const codebaseDirectory = path.resolve(process.cwd(), 'src'); // Adjust as needed
checkImports(codebaseDirectory).catch(err => {
    console.error(err);
    process.exit(1);
});