import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

const checkEmptyCatchBlocks = async (dir) => {
  const patterns = ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx']; // Include JS and TS files
  const files = await Promise.all(patterns.map(pattern => glob.sync(path.join(dir, pattern))));
  const allFiles = files.flat();

  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/\bcatch\s*\(\s*.\s*\)\s*{\s*}/.test(line) || /\bcatch\s*{\s*}/.test(line)) {
        console.error(`Error: Empty catch block found in ${file} at line ${i + 1}`);
        return 1; // Violation found
      }
    }
  }
  return 0; // All good
};

const runCheck = async () => {
  const codebasePath = process.cwd(); // Assume codebase is the current working directory
  const exitCode = await checkEmptyCatchBlocks(codebasePath);
  process.exit(exitCode);
};

runCheck();