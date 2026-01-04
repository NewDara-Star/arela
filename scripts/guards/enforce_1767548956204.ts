import { promises as fs } from 'fs';
import glob from 'glob-promise';

const checkAnyTypeUsage = async () => {
  try {
    const files = await glob('src/**/*.ts'); // Adjust glob pattern for specific file types if necessary
    let violationFound = false;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(': any')) {
        console.error(`Violation found in file: ${file}`);
        violationFound = true;
      }
    }

    if (violationFound) {
      process.exit(1);
    } else {
      console.log('No violations found. All good!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error while scanning files:', error);
    process.exit(1);
  }
};

checkAnyTypeUsage();