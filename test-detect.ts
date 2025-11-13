import { detectSlices } from './src/detect/index.js';

const cwd = '/Users/Star/stride-api';

console.log('Testing slice detection...');
console.log('CWD:', cwd);

try {
  const report = await detectSlices([], cwd);
  console.log('Success!');
  console.log('Slices:', report.sliceCount);
} catch (error) {
  console.error('Error:', error);
}
