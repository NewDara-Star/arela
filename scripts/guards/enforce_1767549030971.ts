import { promises as fs } from 'fs';
import { resolve } from 'path';
import glob from 'glob-promise';

const checkPinnedDependencies = async () => {
  const packageFiles = await glob('**/package.json');

  for (const file of packageFiles) {
    const filePath = resolve(file);
    const content = await fs.readFile(filePath, 'utf-8');
    const packageJson = JSON.parse(content);

    for (const [depType, deps] of Object.entries(packageJson.dependencies || {})) {
      if (/^[^~^]+$/.test(deps)) continue; // Strict version

      console.error(`Violation found in ${filePath}: ${depType} "${deps}" should be pinned.`);
      process.exit(1);
    }

    for (const [depType, deps] of Object.entries(packageJson.devDependencies || {})) {
      if (/^[^~^]+$/.test(deps)) continue; // Strict version

      console.error(`Violation found in ${filePath}: ${depType} "${deps}" should be pinned.`);
      process.exit(1);
    }

    for (const [depType, deps] of Object.entries(packageJson.optionalDependencies || {})) {
      if (/^[^~^]+$/.test(deps)) continue; // Strict version

      console.error(`Violation found in ${filePath}: ${depType} "${deps}" should be pinned.`);
      process.exit(1);
    }
  }

  console.log('All dependencies are pinned correctly.');
  process.exit(0);
};

checkPinnedDependencies();