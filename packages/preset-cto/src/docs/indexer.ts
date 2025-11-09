import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { netFetch } from "../net/fetcher.js";

export interface DocEntry {
  name: string;
  version?: string;
  homepage?: string;
  repository?: string;
  docs?: string;
  description?: string;
}

export interface DocsIndex {
  packages: DocEntry[];
  extras: DocEntry[];
  ts: string;
}

export async function indexDocs(cwd: string): Promise<void> {
  console.log(pc.cyan("Indexing package documentation...\n"));
  
  const packages = await discoverPackages(cwd);
  console.log(pc.dim(`Found ${packages.length} packages\n`));
  
  const entries: DocEntry[] = [];
  
  for (const pkg of packages) {
    try {
      console.log(pc.dim(`  ${pkg.name}...`));
      const entry = await resolvePackageDocs(cwd, pkg.name, pkg.version);
      entries.push(entry);
    } catch (error) {
      console.log(pc.yellow(`  ${pkg.name}: ${(error as Error).message}`));
    }
  }
  
  // Load extras from config
  const configPath = path.join(cwd, ".arela", "docs.config.json");
  const config = await fs.readJson(configPath).catch(() => ({ extras: [] }));
  
  const index: DocsIndex = {
    packages: entries,
    extras: config.extras || [],
    ts: new Date().toISOString(),
  };
  
  const indexPath = path.join(cwd, ".arela", "cache", "docs.idx.json");
  await fs.ensureDir(path.dirname(indexPath));
  await fs.writeJson(indexPath, index, { spaces: 2 });
  
  console.log(pc.green(`\n✓ Indexed ${entries.length} packages`));
  console.log(pc.dim(`  Saved to ${path.relative(cwd, indexPath)}`));
}

async function discoverPackages(cwd: string): Promise<Array<{ name: string; version: string }>> {
  const pkgPath = path.join(cwd, "package.json");
  
  if (!(await fs.pathExists(pkgPath))) {
    return [];
  }
  
  const pkg = await fs.readJson(pkgPath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  return Object.entries(deps).map(([name, version]) => ({
    name,
    version: version as string,
  }));
}

async function resolvePackageDocs(
  cwd: string,
  name: string,
  version: string
): Promise<DocEntry> {
  // Try to fetch package metadata from npm registry
  try {
    const url = `https://registry.npmjs.org/${name}`;
    const result = await netFetch(cwd, url);
    
    if (result.status !== 200) {
      throw new Error(`HTTP ${result.status}`);
    }
    
    const data = JSON.parse(result.body);
    const latestVersion = data["dist-tags"]?.latest || version.replace(/^[\^~]/, "");
    const versionData = data.versions?.[latestVersion] || data.versions?.[Object.keys(data.versions)[0]];
    
    return {
      name,
      version: latestVersion,
      homepage: versionData?.homepage || data.homepage,
      repository: versionData?.repository?.url || data.repository?.url,
      docs: versionData?.homepage || data.homepage,
      description: versionData?.description || data.description,
    };
  } catch (error) {
    // Fallback to basic entry
    return {
      name,
      version,
      description: `Package ${name}`,
    };
  }
}

export async function loadDocsIndex(cwd: string): Promise<DocsIndex | null> {
  const indexPath = path.join(cwd, ".arela", "cache", "docs.idx.json");
  
  if (!(await fs.pathExists(indexPath))) {
    return null;
  }
  
  return await fs.readJson(indexPath);
}

export async function searchDocs(cwd: string, query: string): Promise<DocEntry[]> {
  const index = await loadDocsIndex(cwd);
  
  if (!index) {
    throw new Error("Docs index not found. Run 'arela docs index' first.");
  }
  
  const allEntries = [...index.packages, ...index.extras];
  const lowerQuery = query.toLowerCase();
  
  return allEntries.filter(entry => {
    return (
      entry.name.toLowerCase().includes(lowerQuery) ||
      entry.description?.toLowerCase().includes(lowerQuery)
    );
  });
}
