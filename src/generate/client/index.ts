/**
 * Contract-driven client generator
 * Generates type-safe API clients from OpenAPI 3.0 specifications
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import ora from 'ora';
import colors from 'picocolors';
import { GenerateClientOptions, ClientGenerationResult } from './types.js';
import { generateTypeScriptClient } from './typescript-generator.js';

export { generateTypeScriptClient } from './typescript-generator.js';
export * from './types.js';

export async function generateClient(options: GenerateClientOptions): Promise<void> {
  const { language, contract, contractDir, outputDir = 'src/api', baseURL, dryRun } = options;

  if (!contract && !contractDir) {
    throw new Error('Either --contract or --contract-dir must be specified');
  }

  const outputPath = path.resolve(outputDir);

  if (language === 'typescript') {
    await generateTypeScriptClients(contract, contractDir, outputPath, baseURL, dryRun);
  } else if (language === 'python') {
    throw new Error('Python client generation not yet implemented');
  } else {
    throw new Error(`Unsupported language: ${language}`);
  }
}

async function generateTypeScriptClients(
  contract: string | undefined,
  contractDir: string | undefined,
  outputDir: string,
  baseURL: string | undefined,
  dryRun: boolean | undefined
): Promise<void> {
  let specs: string[] = [];

  if (contract) {
    const resolvedPath = path.resolve(contract);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Contract file not found: ${contract}`);
    }
    specs = [resolvedPath];
  } else if (contractDir) {
    const resolvedDir = path.resolve(contractDir);
    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Contract directory not found: ${contractDir}`);
    }
    specs = await glob(`${resolvedDir}/**/*.{yaml,yml,json}`, {
      ignore: '**/node_modules/**',
    });

    if (specs.length === 0) {
      throw new Error(`No OpenAPI specs found in ${contractDir}`);
    }
  }

  console.log(`\n${colors.cyan('🎨 Generating TypeScript API Clients...')}\n`);

  if (dryRun) {
    console.log(colors.yellow('📋 DRY RUN - No files will be written\n'));
  }

  let totalFilesGenerated = 0;
  let totalLinesOfCode = 0;
  const errors: string[] = [];

  for (const spec of specs) {
    const spinner = ora({
      text: `Processing ${path.basename(spec)}...`,
      color: 'cyan',
    }).start();

    try {
      if (dryRun) {
        spinner.succeed(`${colors.green('✓')} Would generate client for ${path.basename(spec)}`);
      } else {
        const result = await generateTypeScriptClient(spec, outputDir, baseURL);

        if (result.success) {
          totalFilesGenerated += result.filesGenerated.length;
          totalLinesOfCode += result.linesOfCode;

          spinner.succeed(
            `${colors.green('✓')} Generated ${result.filesGenerated.length} files (${result.linesOfCode} lines)`
          );

          // Print file details
          result.filesGenerated.forEach((file) => {
            const relativePath = path.relative(process.cwd(), file);
            console.log(`  ${colors.gray('📝')} ${relativePath}`);
          });
        } else {
          spinner.fail(`Failed to generate client for ${path.basename(spec)}`);
          if (result.errors) {
            result.errors.forEach((err) => console.log(`  ${colors.red('✗')} ${err}`));
          }
          errors.push(`${spec}: ${result.errors?.join(', ')}`);
        }
      }
    } catch (error) {
      spinner.fail(`Error processing ${path.basename(spec)}`);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ${colors.red('✗')} ${errorMsg}`);
      errors.push(`${spec}: ${errorMsg}`);
    }
  }

  // Summary
  console.log(`\n${colors.cyan('✨ Generation Summary')}`);
  console.log(`  ${colors.green('✓')} Specs processed: ${specs.length}`);
  console.log(`  ${colors.green('✓')} Files generated: ${totalFilesGenerated}`);
  console.log(`  ${colors.green('✓')} Lines of code: ${totalLinesOfCode}`);

  if (errors.length > 0) {
    console.log(`\n${colors.red('⚠ Errors encountered:')}`);
    errors.forEach((err) => console.log(`  ${colors.red('✗')} ${err}`));
  }

  if (!dryRun && totalFilesGenerated > 0) {
    console.log(`\n${colors.green('💡 Usage:')}`);
    console.log(`  import { WorkoutApiClient } from '${path.relative(process.cwd(), outputDir)}/workout';`);
    console.log(`\n  const client = new WorkoutApiClient({`);
    console.log(`    baseURL: 'https://api.example.com'${baseURL ? ` // or '${baseURL}'` : ''}`);
    console.log(`    token: 'your-auth-token'`);
    console.log(`  });\n`);
  }

  console.log('');
}
