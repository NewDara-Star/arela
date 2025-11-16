import * as vscode from 'vscode';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import type { IncomingMessage } from 'http';
import { getPlatformTarget } from './platform';
import { verifyChecksum } from './checksum';
import type { PlatformTarget } from './platform';

const GITHUB_REPO = 'NewDara-Star/arela';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

export class ServerDownloader {
  private readonly storageDir: string;
  private readonly version: string;
  // TODO: For local testing, set this to a local file:// URL
  // private readonly baseUrl = 'file:///path/to/test/binaries';
  private readonly baseUrl: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.storageDir = context.globalStorageUri.fsPath;
    this.version = this.context.extension.packageJSON.version ?? '0.0.0';
    this.baseUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${this.version}`;
  }

  async ensureServerBinary(): Promise<string> {
    const target = getPlatformTarget();
    const fileExt = target.startsWith('win32') ? '.exe' : '';
    const targetDir = path.join(this.storageDir, target);
    const binaryPath = path.join(targetDir, `arela-server${fileExt}`);
    const versionFile = path.join(targetDir, '.version');

    await fs.mkdir(targetDir, { recursive: true });

    // Check if binary exists and version matches
    if (await this.fileExists(binaryPath)) {
      const currentVersion = await this.readVersionFile(versionFile);
      
      if (currentVersion === this.version) {
        // Binary exists and version matches - use it
        return binaryPath;
      }
      
      // Version mismatch - clean up old binary
      console.log(`[Downloader] Version mismatch: ${currentVersion} -> ${this.version}. Cleaning up old binary...`);
      await this.safeUnlink(binaryPath);
      await this.safeUnlink(versionFile);
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Downloading Arela server…',
          },
          async (progress) => {
            await this.downloadAndVerify(target, binaryPath, progress);
          },
        );

        if (!target.startsWith('win32')) {
          await fs.chmod(binaryPath, 0o755);
        }

        return binaryPath;
      } catch (error) {
        const choice = await this.promptDownloadFailure(error);
        if (choice === 'Retry') {
          continue;
        }

        if (choice === 'Manual Install') {
          await vscode.env.openExternal(
            vscode.Uri.parse(`https://github.com/${GITHUB_REPO}/releases`),
          );
          continue;
        }

        throw error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  private async downloadAndVerify(
    target: PlatformTarget,
    binaryPath: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
  ) {
    const isWindows = target.startsWith('win32');
    const assetName = `arela-server-${target}${isWindows ? '.exe' : ''}`;
    const url = `${this.baseUrl}/${assetName}`;
    const checksumUrl = `${url}.sha256`;
    const tempPath = `${binaryPath}.download`;
    let renamed = false;

    await this.safeUnlink(tempPath);

    try {
      progress.report({ message: 'Downloading binary…' });
      await this.withRetries(() => this.downloadFile(url, tempPath, progress), 'binary download');

      progress.report({ message: 'Fetching checksum…' });
      const checksum = await this.withRetries(() => this.downloadText(checksumUrl), 'checksum download');

      progress.report({ message: 'Verifying checksum…' });
      await verifyChecksum(tempPath, checksum);

      await fs.rename(tempPath, binaryPath);
      renamed = true;
      
      // Write version file after successful download
      const versionFile = path.join(path.dirname(binaryPath), '.version');
      await fs.writeFile(versionFile, this.version, 'utf8');
    } finally {
      if (!renamed) {
        await this.safeUnlink(tempPath);
      }
    }
  }

  private async promptDownloadFailure(error: unknown) {
    const message = `Failed to download Arela server: ${this.formatError(error)}`;
    return vscode.window.showErrorMessage(message, 'Retry', 'Manual Install', 'Cancel');
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private async withRetries<T>(operation: () => Promise<T>, label: string): Promise<T> {
    let attempt = 0;
    let delay = BASE_DELAY_MS;
    let lastError: unknown;

    while (attempt < MAX_ATTEMPTS) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;

        if (attempt >= MAX_ATTEMPTS) {
          break;
        }

        await this.wait(delay);
        delay *= 2;
      }
    }

    const failureMessage = `${label} failed after ${MAX_ATTEMPTS} attempts.`;
    if (lastError instanceof Error) {
      throw new Error(`${failureMessage} ${lastError.message}`, { cause: lastError });
    }

    throw new Error(failureMessage);
  }

  private wait(duration: number) {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  private downloadFile(
    url: string,
    destination: string,
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
  ) {
    return new Promise<void>((resolve, reject) => {
      this.performRequest(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          response.resume();
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const total = Number(response.headers['content-length'] || 0);
        let downloaded = 0;
        let lastPercent = 0;
        const fileStream = createWriteStream(destination);

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = Math.floor((downloaded / total) * 100);
            if (percent !== lastPercent) {
              progress?.report({ message: `Downloading binary… ${percent}%` });
              lastPercent = percent;
            }
          }
        });

        response.on('error', (error: Error) => {
          fileStream.destroy();
          reject(error);
        });

        fileStream.on('finish', () => resolve());
        fileStream.on('error', (error) => reject(error));

        response.pipe(fileStream);
      }, reject);
    });
  }

  private downloadText(url: string) {
    return new Promise<string>((resolve, reject) => {
      this.performRequest(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          response.resume();
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          data += chunk;
        });
        response.on('end', () => resolve(data));
        response.on('error', (error: Error) => reject(error));
      }, reject);
    });
  }

  private performRequest(
    url: string,
    onResponse: (response: IncomingMessage) => void,
    onError: (error: Error) => void,
    redirectCount = 0,
  ) {
    const request = https.get(url, { headers: { 'User-Agent': 'arela-extension' } }, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        if (redirectCount > 5) {
          onError(new Error('Too many redirects while downloading Arela server'));
          return;
        }

        const nextUrl = new URL(response.headers.location, url).toString();
        this.performRequest(nextUrl, onResponse, onError, redirectCount + 1);
        return;
      }

      onResponse(response);
    });

    request.on('error', (error) => {
      onError(error);
    });
  }

  private async fileExists(targetPath: string) {
    try {
      const stat = await fs.stat(targetPath);
      return stat.isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private async safeUnlink(targetPath: string) {
    try {
      await fs.unlink(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async readVersionFile(versionFilePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(versionFilePath, 'utf8');
      return content.trim();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // Version file doesn't exist (old installation)
      }
      throw error;
    }
  }
}

export async function ensureServer(context: vscode.ExtensionContext) {
  const downloader = new ServerDownloader(context);
  return downloader.ensureServerBinary();
}
