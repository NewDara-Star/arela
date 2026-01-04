import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

const slicesDir = path.join(process.cwd(), 'slices');
const testsDir = path.join(process.cwd(), 'tests');

async function checkSlicesForTests() {
    const sliceDirectories = await getDirectories(slicesDir);
    const testDirectories = await getDirectories(testsDir);

    const violations = sliceDirectories.filter(slice => {
        const sliceName = path.basename(slice);
        return !testDirectories.includes(path.join(testsDir, sliceName));
    });

    if (violations.length > 0) {
        console.error('Violations found:');
        violations.forEach(slice => {
            console.error(`- ${slice}`);
        });
        process.exit(1);
    } else {
        console.log('All slices have corresponding tests.');
        process.exit(0);
    }
}

async function getDirectories(source) {
    return new Promise((resolve, reject) => {
        glob(`${source}/*`, { onlyDirectories: true }, (err, directories) => {
            if (err) {
                return reject(err);
            }
            resolve(directories);
        });
    });
}

checkSlicesForTests().catch(err => {
    console.error('An error occurred:', err);
    process.exit(1);
});