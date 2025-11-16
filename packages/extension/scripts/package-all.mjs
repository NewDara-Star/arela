#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const targets = [
  'darwin-x64',
  'darwin-arm64',
  'win32-x64',
  'win32-arm64',
  'linux-x64',
  'linux-arm64',
];

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const packageRoot = path.resolve(scriptDir, '..');
  const distDir = path.join(packageRoot, 'dist');
  const pkgJsonPath = path.join(packageRoot, 'package.json');
  const pkg = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8'));
  const version = pkg.version;

  if (!version) {
    throw new Error('Unable to determine extension version from package.json');
  }

  await fs.promises.mkdir(distDir, { recursive: true });

  for (const target of targets) {
    const outputPath = path.join(distDir, `arela-${version}-${target}.vsix`);
    console.log(`Packaging VSIX for ${target} → ${outputPath}`);
    execSync(`npx --yes @vscode/vsce package --target ${target} --out "${outputPath}"`, {
      cwd: packageRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        VSCE_PACKAGE_TARGET: target,
      },
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
