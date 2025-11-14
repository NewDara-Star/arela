import { glob } from 'glob';
import path from 'path';
import { execa } from 'execa';
import { runDredd, getDreddConfig } from './dredd-runner.js';
import fs from 'fs-extra';

export interface ContractValidationOptions {
  contractPath?: string;      // Specific contract to validate
  serverUrl?: string;          // API server URL
  startServer?: string;        // Command to start server
  watch?: boolean;             // Watch mode
  hookfiles?: string[];        // Custom hooks
  cwd?: string;               // Working directory
}

export interface ContractValidationResult {
  passed: boolean;
  total: number;
  failures: number;
  contracts: ContractResult[];
}

export interface ContractResult {
  path: string;
  passed: boolean;
  total: number;
  failures: number;
  errors: number;
  passes: number;
  details: string;
}

export async function findOpenAPISpecs(contractPath?: string, cwd?: string): Promise<string[]> {
  const workDir = cwd || process.cwd();

  if (contractPath) {
    // Validate specific contract exists
    const fullPath = path.isAbsolute(contractPath)
      ? contractPath
      : path.join(workDir, contractPath);

    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`Contract file not found: ${fullPath}`);
    }

    return [fullPath];
  }

  // Find all OpenAPI specs in openapi/ directory
  const openapiDir = path.join(workDir, 'openapi');

  if (!(await fs.pathExists(openapiDir))) {
    return [];
  }

  const specs = await glob('**/*.{yaml,yml,json}', {
    cwd: openapiDir,
    absolute: true,
  });

  return specs.sort();
}

export async function waitForServer(
  serverUrl: string,
  maxRetries: number = 30,
  retryDelay: number = 1000
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(serverUrl, { method: 'HEAD' });
      if (response.ok || response.status === 404) {
        // 404 is fine - server is up
        return;
      }
    } catch {
      // Connection failed, retry
      if (i === maxRetries - 1) {
        throw new Error(`Server did not become available at ${serverUrl} after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

export async function startAPIServer(command: string): Promise<any> {
  const [cmd, ...args] = command.split(' ');

  try {
    const process = execa(cmd, args, {
      stdio: 'pipe',
      preferLocal: true,
    });

    // Wait a bit for process to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if process is still running
    if ((process as any).killed) {
      const output = await (process as any);
      throw new Error(`Server process exited immediately: ${output.stderr || output.stdout}`);
    }

    return process;
  } catch (error) {
    throw new Error(`Failed to start server with command "${command}": ${(error as Error).message}`);
  }
}

export async function validateContracts(
  options: ContractValidationOptions
): Promise<ContractValidationResult> {
  const {
    contractPath,
    serverUrl = 'http://localhost:3000',
    startServer,
    hookfiles,
    cwd = process.cwd(),
  } = options;

  // 1. Find OpenAPI specs
  const specs = await findOpenAPISpecs(contractPath, cwd);

  if (specs.length === 0) {
    throw new Error('No OpenAPI specs found in openapi/ directory');
  }

  // 2. Start server if needed
  let serverProcess: any;
  if (startServer) {
    serverProcess = await startAPIServer(startServer);
    await waitForServer(serverUrl);
  }

  try {
    // 3. Run Dredd for each spec
    const contractResults: ContractResult[] = [];

    for (const spec of specs) {
      const config = getDreddConfig(spec, serverUrl, hookfiles);
      const result = await runDredd(config);

      contractResults.push({
        path: spec,
        passed: !result.error && result.stats.failures === 0 && result.stats.errors === 0,
        total: result.stats.total,
        failures: result.stats.failures + result.stats.errors,
        errors: result.stats.errors,
        passes: result.stats.passes,
        details: result.error ? result.error.message : 'All tests passed',
      });
    }

    // 4. Aggregate results
    const totalTests = contractResults.reduce((sum, r) => sum + r.total, 0);
    const totalFailures = contractResults.reduce((sum, r) => sum + r.failures, 0);
    const allPassed = contractResults.every(r => r.passed);

    return {
      passed: allPassed,
      total: totalTests,
      failures: totalFailures,
      contracts: contractResults,
    };
  } finally {
    // 5. Cleanup
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch {
        // Ignore errors during cleanup
      }
    }
  }
}

export async function validateContractsWithWatch(
  options: ContractValidationOptions
): Promise<void> {
  // Watch mode would require file watching and re-running validation
  // For now, run once
  const result = await validateContracts(options);

  if (!result.passed) {
    process.exit(1);
  }
}
