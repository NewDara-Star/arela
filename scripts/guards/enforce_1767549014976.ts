import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

const checkProcessExit = async () => {
  const files = await new Promise((resolve, reject) => {
    glob('**/*.ts', { cwd: process.cwd(), ignore: ['node_modules/**', 'dist/**', 'build/**'] }, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });

  const violations = files.filter(file => {
    const filePath = path.join(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return content.includes('process.exit') && !filePath.startsWith(path.join(process.cwd(), 'src/cli.ts')) && !filePath.startsWith(path.join(process.cwd(), 'scripts/'));
  });

  if (violations.length > 0) {
    console.error('Violation found: process.exit used in the following files:');
    violations.forEach(file => console.error(file));
    process.exit(1);
  }

  console.log('All checks passed. No violations found.');
  process.exit(0);
};

checkProcessExit();