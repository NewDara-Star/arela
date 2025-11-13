import { detectSlices } from './dist/detect/index.js';

const cwd = '/Users/Star/stride-api';
const repoPaths = [cwd];

console.log('Testing compiled slice detection...');
console.log('CWD:', cwd);
console.log('Repo paths:', repoPaths);

try {
  const report = await detectSlices(repoPaths, cwd);
  console.log('Success!');
  console.log('Slices:', report.sliceCount);
} catch (error) {
  console.error('Error:', error.message);
}
