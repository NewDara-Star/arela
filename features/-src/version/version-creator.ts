import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";

export interface CreateSliceVersionResult {
  newSlicePath: string;
  newSpecPath?: string;
}

export async function createSliceVersion(
  repoPath: string,
  slice: string,
  version: number
): Promise<CreateSliceVersionResult> {
  if (version < 2) {
    throw new Error("Version number must be 2 or greater.");
  }

  const sliceDir = await findSliceDirectory(repoPath, slice);
  if (!sliceDir) {
    throw new Error(
      `Slice "${slice}" not found. Expected at features/${slice} or src/features/${slice}.`
    );
  }

  const parentDir = path.dirname(sliceDir);
  const targetDir = path.join(parentDir, `${slice}-v${version}`);

  if (await fs.pathExists(targetDir)) {
    throw new Error(`Target slice directory already exists: ${targetDir}`);
  }

  await fs.copy(sliceDir, targetDir);

  const previousVersion = version - 1;
  await updateVersionMarkers(targetDir, previousVersion, version);

  const specPath = await findSpecForSlice(repoPath, slice);
  let newSpecPath: string | undefined;

  if (specPath) {
    const ext = path.extname(specPath);
    const baseName = path.basename(specPath, ext);
    const versionedName = appendVersionSuffix(baseName, version);
    newSpecPath = path.join(path.dirname(specPath), `${versionedName}${ext}`);

    if (await fs.pathExists(newSpecPath)) {
      throw new Error(`Versioned OpenAPI spec already exists: ${newSpecPath}`);
    }

    await fs.copy(specPath, newSpecPath);
    await replaceVersionInFile(newSpecPath, previousVersion, version);
  }

  return {
    newSlicePath: targetDir,
    newSpecPath,
  };
}

async function findSliceDirectory(repoPath: string, slice: string): Promise<string | undefined> {
  const candidates = [
    path.join(repoPath, "features", slice),
    path.join(repoPath, "src", "features", slice),
    path.join(repoPath, slice),
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function updateVersionMarkers(dir: string, previousVersion: number, nextVersion: number) {
  if (previousVersion < 1) {
    return;
  }

  const files = await fg(["**/*.{ts,tsx,js,jsx,tsm,cts,mts,md,yaml,yml,json}"], {
    cwd: dir,
    dot: false,
    onlyFiles: true,
  });

  await Promise.all(
    files.map(async (file) => {
      const absolutePath = path.join(dir, file);
      await replaceVersionInFile(absolutePath, previousVersion, nextVersion);
    })
  );
}

async function replaceVersionInFile(filePath: string, previousVersion: number, nextVersion: number) {
  const contents = await fs.readFile(filePath, "utf8");

  const apiSegment = new RegExp(`/v${previousVersion}(?=/)`, "g");
  const looseMarker = new RegExp(`\\bv${previousVersion}\\b`, "g");
  const versionLabel = new RegExp(`(version\\s*:?\\s*)(${previousVersion})(\\b)`, "gi");

  let updated = contents.replace(apiSegment, `/v${nextVersion}`);
  updated = updated.replace(looseMarker, `v${nextVersion}`);
  updated = updated.replace(
    versionLabel,
    (_match, prefix: string, _value: string, suffix: string) => `${prefix}${nextVersion}${suffix}`
  );

  if (updated !== contents) {
    await fs.writeFile(filePath, updated, "utf8");
  }
}

async function findSpecForSlice(repoPath: string, slice: string): Promise<string | undefined> {
  const normalized = slice.replace(/-v\d+$/, "");
  const exactCandidates = [
    path.join(repoPath, "openapi", `${normalized}.yaml`),
    path.join(repoPath, "openapi", `${normalized}.yml`),
    path.join(repoPath, "openapi", `${normalized}-api.yaml`),
    path.join(repoPath, "openapi", `${normalized}-api.yml`),
  ];

  for (const candidate of exactCandidates) {
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  const matches = await fg(`openapi/**/*${normalized}*.{yaml,yml,json}`, {
    cwd: repoPath,
    absolute: true,
  });

  return matches[0];
}

function appendVersionSuffix(base: string, version: number): string {
  const withoutExistingVersion = base.replace(/-v\d+$/, "");
  return `${withoutExistingVersion}-v${version}`;
}
