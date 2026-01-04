import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

const SLICES_DIR = path.join(process.cwd(), 'slices');

async function checkSlicesReadme() {
    const directories = await new Promise((resolve, reject) => {
        glob(`${SLICES_DIR}/*`, { mark: true }, (err, matches) => {
            if (err) return reject(err);
            resolve(matches.filter(m => fs.lstatSync(m).isDirectory()));
        });
    });

    const violations = [];

    for (const dir of directories) {
        const readmePath = path.join(dir, 'README.md');
        const hasReadme = await fs.pathExists(readmePath);

        if (!hasReadme) {
            violations.push(dir);
        }
    }

    if (violations.length > 0) {
        console.error('Slices must have README:');
        violations.forEach(violation => console.error(`- ${violation}`));
        process.exit(1);
    } else {
        console.log('All slices have README.md.');
        process.exit(0);
    }
}

checkSlicesReadme();