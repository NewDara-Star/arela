
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const targetFile = path.join(projectRoot, 'src/mcp/server.ts');
const MAX_LINES = 400;

async function run() {
  try {
    if (!await fs.pathExists(targetFile)) {
      console.error(`❌ File not found: ${targetFile}`);
      process.exit(1);
    }

    const content = await fs.readFile(targetFile, 'utf-8');
    const lines = content.split('\n').length;

    console.log(`Checking ${targetFile}...`);
    console.log(`Lines: ${lines} / ${MAX_LINES}`);

    if (lines > MAX_LINES) {
      console.error(`❌ FAILURE: File exceeds ${MAX_LINES} lines. Refactor required.`);
      process.exit(1);
    }

    console.log("✅ SUCCESS: File size passed.");
  } catch (e: any) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

run();