import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';

const isCamelCase = (filename) => /^[A-Z]/.test(path.basename(filename).replace(/[^A-Za-z]/g, ''));
const isSnakeCaseOrKebabCase = (filename) => /^[a-z0-9_/-]*$/.test(path.basename(filename));

const scanForViolations = async (dir) => {
  const pattern = path.join(dir, '**', '*.*');
  const files = await new Promise((resolve, reject) => {
    glob(pattern, { nodir: true }, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });

  const violations = files.filter((file) => isCamelCase(file) && !isSnakeCaseOrKebabCase(file));

  return violations;
};

const main = async () => {
  const codebaseDir = process.cwd(); // Assuming the script runs from the root of the codebase
  const violations = await scanForViolations(codebaseDir);

  if (violations.length > 0) {
    console.error('Filenames must be snake_case or kebab-case. Violations found:');
    violations.forEach((file) => console.error(` - ${file}`));
    process.exit(1);
  }

  console.log('All filenames are compliant.');
  process.exit(0);
};

main();