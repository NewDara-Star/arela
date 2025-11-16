import { createHash } from 'crypto';
import { createReadStream } from 'fs';

export async function verifyChecksum(filePath: string, expectedChecksum: string): Promise<void> {
  const normalizedExpected = normalizeChecksum(expectedChecksum);
  if (!normalizedExpected) {
    throw new Error('Invalid checksum value received');
  }

  const calculated = await hashFile(filePath);
  if (calculated !== normalizedExpected) {
    throw new Error(
      `Checksum mismatch. Expected ${normalizedExpected}, received ${calculated}. File may be corrupted.`,
    );
  }
}

function normalizeChecksum(value: string): string | null {
  if (!value) {
    return null;
  }

  const token = value.trim().split(/\s+/)[0];
  if (!token) {
    return null;
  }

  return token.toLowerCase();
}

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', (error) => reject(error));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
