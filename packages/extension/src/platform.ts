const SUPPORTED_TARGETS = new Set([
  'win32-x64',
  'win32-arm64',
  'darwin-x64',
  'darwin-arm64',
  'linux-x64',
  'linux-arm64',
  'linux-armhf',
]);

export type PlatformTarget =
  | 'win32-x64'
  | 'win32-arm64'
  | 'darwin-x64'
  | 'darwin-arm64'
  | 'linux-x64'
  | 'linux-arm64'
  | 'linux-armhf';

export function getPlatformTarget(platform = process.platform, arch = process.arch): PlatformTarget {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedArch = normalizeArch(arch, normalizedPlatform);
  const target = `${normalizedPlatform}-${normalizedArch}` as PlatformTarget;

  if (!SUPPORTED_TARGETS.has(target)) {
    throw new Error(`Unsupported platform target: ${platform} ${arch}`);
  }

  return target;
}

function normalizePlatform(platform: NodeJS.Platform) {
  switch (platform) {
    case 'win32':
      return 'win32';
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    default:
      throw new Error(`Unsupported OS platform: ${platform}`);
  }
}

function normalizeArch(arch: string, platform: string) {
  switch (arch) {
    case 'x64':
      return 'x64';
    case 'arm64':
      return 'arm64';
    case 'arm':
      if (platform === 'linux') {
        return 'armhf';
      }
      break;
    default:
      break;
  }

  throw new Error(`Unsupported architecture: ${arch} on ${platform}`);
}
