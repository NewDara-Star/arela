# EXTENSION-003: Implement Downloader Shim

**Category:** Foundation  
**Priority:** P0 (Blocking)  
**Estimated Time:** 6 hours  
**Assignee:** TBD  
**Status:** 🔴 Not Started

---

## Context

Implement the "Downloader Shim" pattern (rust-analyzer style) to download the platform-specific `arela-server` binary from GitHub Releases on first activation. This allows us to publish a single universal VSIX instead of 6-8 platform-specific packages.

## Requirements

### Must Have
- [ ] Detect OS and architecture (process.platform, process.arch)
- [ ] Download correct binary from GitHub Releases
- [ ] Store binary in `context.globalStorageUri`
- [ ] Verify binary integrity (checksum)
- [ ] Handle download failures gracefully
- [ ] Show progress notification to user
- [ ] Retry logic (3 attempts)
- [ ] Fallback to manual installation

### Should Have
- [ ] Cache binary across extension updates
- [ ] Check if binary already exists (skip download)
- [ ] Validate binary version matches extension version
- [ ] Delete old binaries on version mismatch

### Nice to Have
- [ ] Resume partial downloads
- [ ] Mirror support (fallback URLs)
- [ ] Offline mode detection

## Acceptance Criteria

- [ ] Downloads correct binary for user's platform
- [ ] Shows progress notification during download
- [ ] Stores binary in persistent location
- [ ] Verifies checksum before using
- [ ] Handles network errors gracefully
- [ ] Provides clear error messages
- [ ] Works on all platforms (Windows, macOS, Linux)

## Technical Details

### Platform Detection

```typescript
// src/downloader.ts
export function getPlatformTarget(): string {
  const platform = process.platform;
  const arch = process.arch;

  const targets: Record<string, Record<string, string>> = {
    win32: {
      x64: 'win32-x64',
      arm64: 'win32-arm64',
    },
    darwin: {
      x64: 'darwin-x64',
      arm64: 'darwin-arm64',
    },
    linux: {
      x64: 'linux-x64',
      arm64: 'linux-arm64',
      arm: 'linux-armhf',
    },
  };

  const target = targets[platform]?.[arch];
  if (!target) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  return target;
}
```

### Download Logic

```typescript
import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class ServerDownloader {
  constructor(private context: vscode.ExtensionContext) {}

  async ensureServerBinary(): Promise<string> {
    const binaryPath = this.getBinaryPath();

    // Check if already exists
    if (fs.existsSync(binaryPath)) {
      console.log('[Downloader] Binary already exists:', binaryPath);
      return binaryPath;
    }

    // Download
    await this.downloadBinary(binaryPath);
    return binaryPath;
  }

  private getBinaryPath(): string {
    const target = getPlatformTarget();
    const binaryName = process.platform === 'win32' 
      ? 'arela-server.exe' 
      : 'arela-server';
    
    const storageUri = this.context.globalStorageUri;
    return path.join(storageUri.fsPath, target, binaryName);
  }

  private async downloadBinary(binaryPath: string): Promise<void> {
    const target = getPlatformTarget();
    const version = this.context.extension.packageJSON.version;
    const url = `https://github.com/yourusername/arela/releases/download/v${version}/arela-server-${target}${process.platform === 'win32' ? '.exe' : ''}`;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Arela: Downloading server binary...',
        cancellable: false,
      },
      async (progress) => {
        // Create directory
        const dir = path.dirname(binaryPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Download
        await this.download(url, binaryPath, progress);

        // Verify checksum
        await this.verifyChecksum(binaryPath, url + '.sha256');

        // Make executable (Unix)
        if (process.platform !== 'win32') {
          fs.chmodSync(binaryPath, 0o755);
        }

        vscode.window.showInformationMessage('Arela server binary downloaded successfully!');
      }
    );
  }

  private async download(
    url: string,
    dest: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const percent = (downloadedBytes / totalBytes) * 100;
          progress.report({ 
            message: `${Math.round(percent)}%`,
            increment: (chunk.length / totalBytes) * 100,
          });
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    });
  }

  private async verifyChecksum(binaryPath: string, checksumUrl: string): Promise<void> {
    // Download checksum file
    const checksumData = await this.downloadText(checksumUrl);
    const expectedChecksum = checksumData.trim().split(' ')[0];

    // Calculate actual checksum
    const fileBuffer = fs.readFileSync(binaryPath);
    const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (actualChecksum !== expectedChecksum) {
      fs.unlinkSync(binaryPath);
      throw new Error('Checksum verification failed! Binary may be corrupted.');
    }
  }

  private async downloadText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }
}
```

### Error Handling

```typescript
export async function ensureServer(context: vscode.ExtensionContext): Promise<string> {
  const downloader = new ServerDownloader(context);

  try {
    return await downloader.ensureServerBinary();
  } catch (error) {
    const message = `Failed to download Arela server binary: ${error.message}`;
    
    const action = await vscode.window.showErrorMessage(
      message,
      'Retry',
      'Manual Install',
      'Cancel'
    );

    if (action === 'Retry') {
      return ensureServer(context); // Recursive retry
    } else if (action === 'Manual Install') {
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/yourusername/arela/releases'));
      throw new Error('Manual installation required');
    } else {
      throw new Error('Server binary download cancelled');
    }
  }
}
```

## Files to Create

- `packages/extension/src/downloader.ts`
- `packages/extension/src/platform.ts`
- `packages/extension/src/checksum.ts`

## Dependencies

- **Blocks:** EXTENSION-004 (server lifecycle)
- **Blocked by:** EXTENSION-001 (monorepo setup)

## Testing

### Manual Test
1. Delete `globalStorageUri` directory
2. Activate extension
3. Verify download progress notification
4. Verify binary exists in correct location
5. Verify binary is executable

### Unit Tests
- [ ] Test platform detection (all combinations)
- [ ] Test URL construction
- [ ] Test checksum verification
- [ ] Test error handling (network failure)
- [ ] Test retry logic

### Integration Tests
- [ ] Test download on macOS (Intel and ARM)
- [ ] Test download on Windows (x64 and ARM)
- [ ] Test download on Linux (x64 and ARM)

## Documentation

- Document manual installation process
- Add troubleshooting guide for download failures
- Document offline usage (if binary already exists)

## Notes

- GitHub Releases must exist before this works (CI/CD ticket)
- Consider rate limiting (GitHub API has limits)
- Cache binary across extension updates (check version)
- Provide clear error messages for firewall/proxy issues
- Test on corporate networks (may block GitHub)

## Related

- Architecture Decision: Section 3.5.1 "Downloader Shim"
- Validation: rust-analyzer pattern
- CI/CD: EXTENSION-017 (must create releases)
