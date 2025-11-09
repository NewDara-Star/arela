import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import type { RepoFingerprint, TechStack } from "./types.js";

export async function fingerprintRepo(cwd: string): Promise<RepoFingerprint> {
  const name = path.basename(cwd);
  
  // Detect monorepo
  const isMonorepo = await detectMonorepo(cwd);
  const workspaces = isMonorepo ? await detectWorkspaces(cwd) : undefined;
  
  // Detect tech stack
  const techStack = await detectTechStack(cwd);
  
  // Find entrypoints
  const entrypoints = await detectEntrypoints(cwd);
  
  // Check for CI/Docker
  const hasCI = await fs.pathExists(path.join(cwd, ".github/workflows"));
  const hasDocker = await fs.pathExists(path.join(cwd, "Dockerfile")) ||
                    await fs.pathExists(path.join(cwd, "docker-compose.yml"));
  
  return {
    path: cwd,
    name,
    isMonorepo,
    workspaces,
    techStack,
    entrypoints,
    hasCI,
    hasDocker,
  };
}

async function detectMonorepo(cwd: string): Promise<boolean> {
  const indicators = [
    "pnpm-workspace.yaml",
    "lerna.json",
    "nx.json",
  ];
  
  for (const file of indicators) {
    if (await fs.pathExists(path.join(cwd, file))) {
      return true;
    }
  }
  
  // Check package.json for workspaces
  const pkgPath = path.join(cwd, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    if (pkg.workspaces) {
      return true;
    }
  }
  
  return false;
}

async function detectWorkspaces(cwd: string): Promise<string[]> {
  const workspaces: string[] = [];
  
  // pnpm-workspace.yaml
  const pnpmWorkspace = path.join(cwd, "pnpm-workspace.yaml");
  if (await fs.pathExists(pnpmWorkspace)) {
    // Simple parsing - in production use yaml parser
    const content = await fs.readFile(pnpmWorkspace, "utf8");
    const matches = content.match(/- ['"](.+?)['"]/g);
    if (matches) {
      workspaces.push(...matches.map(m => m.replace(/- ['"](.+?)['"]/, "$1")));
    }
  }
  
  // package.json workspaces
  const pkgPath = path.join(cwd, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    if (Array.isArray(pkg.workspaces)) {
      workspaces.push(...pkg.workspaces);
    } else if (pkg.workspaces?.packages) {
      workspaces.push(...pkg.workspaces.packages);
    }
  }
  
  return [...new Set(workspaces)];
}

async function detectTechStack(cwd: string): Promise<TechStack> {
  const languages: string[] = [];
  const frameworks: string[] = [];
  const packageManagers: string[] = [];
  const databases: string[] = [];
  const infrastructure: string[] = [];
  
  // Package managers
  if (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml"))) {
    packageManagers.push("pnpm");
  }
  if (await fs.pathExists(path.join(cwd, "package-lock.json"))) {
    packageManagers.push("npm");
  }
  if (await fs.pathExists(path.join(cwd, "yarn.lock"))) {
    packageManagers.push("yarn");
  }
  if (await fs.pathExists(path.join(cwd, "requirements.txt"))) {
    packageManagers.push("pip");
    languages.push("python");
  }
  if (await fs.pathExists(path.join(cwd, "Gemfile"))) {
    packageManagers.push("bundler");
    languages.push("ruby");
  }
  if (await fs.pathExists(path.join(cwd, "go.mod"))) {
    packageManagers.push("go-modules");
    languages.push("go");
  }
  if (await fs.pathExists(path.join(cwd, "Cargo.toml"))) {
    packageManagers.push("cargo");
    languages.push("rust");
  }
  
  // Languages from extensions
  const files = await glob("**/*.{ts,tsx,js,jsx,py,go,rs,rb,java,kt,swift}", {
    cwd,
    ignore: ["node_modules/**", "dist/**", "build/**", ".git/**"],
    nodir: true,
  });
  
  const extMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    rs: "rust",
    rb: "ruby",
    java: "java",
    kt: "kotlin",
    swift: "swift",
  };
  
  for (const file of files) {
    const ext = path.extname(file).slice(1);
    const lang = extMap[ext];
    if (lang && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  // Frameworks from package.json
  const pkgPath = path.join(cwd, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const frameworkMap: Record<string, string> = {
      react: "react",
      next: "nextjs",
      vue: "vue",
      "@angular/core": "angular",
      svelte: "svelte",
      express: "express",
      fastify: "fastify",
      "@nestjs/core": "nestjs",
      "react-native": "react-native",
    };
    
    for (const [dep, framework] of Object.entries(frameworkMap)) {
      if (deps[dep] && !frameworks.includes(framework)) {
        frameworks.push(framework);
      }
    }
    
    // Databases
    const dbMap: Record<string, string> = {
      pg: "postgresql",
      mysql: "mysql",
      mongodb: "mongodb",
      redis: "redis",
      "@supabase/supabase-js": "supabase",
      prisma: "prisma",
    };
    
    for (const [dep, db] of Object.entries(dbMap)) {
      if (deps[dep] && !databases.includes(db)) {
        databases.push(db);
      }
    }
  }
  
  // Infrastructure
  if (await fs.pathExists(path.join(cwd, "Dockerfile"))) {
    infrastructure.push("docker");
  }
  if (await fs.pathExists(path.join(cwd, "docker-compose.yml"))) {
    infrastructure.push("docker-compose");
  }
  if (await fs.pathExists(path.join(cwd, "terraform"))) {
    infrastructure.push("terraform");
  }
  if (await fs.pathExists(path.join(cwd, "k8s")) || 
      await fs.pathExists(path.join(cwd, "kubernetes"))) {
    infrastructure.push("kubernetes");
  }
  
  return {
    languages,
    frameworks,
    packageManagers,
    databases,
    infrastructure,
  };
}

async function detectEntrypoints(cwd: string): Promise<string[]> {
  const entrypoints: string[] = [];
  
  // Package.json scripts
  const pkgPath = path.join(cwd, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    if (pkg.main) entrypoints.push(pkg.main);
    if (pkg.bin) {
      if (typeof pkg.bin === "string") {
        entrypoints.push(pkg.bin);
      } else {
        entrypoints.push(...Object.values(pkg.bin).filter((v): v is string => typeof v === "string"));
      }
    }
  }
  
  // Common entrypoint patterns
  const patterns = [
    "src/index.*",
    "src/main.*",
    "apps/*/src/index.*",
    "apps/*/src/main.*",
    "bin/*",
  ];
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd,
      ignore: ["node_modules/**", "dist/**", "build/**"],
      nodir: true,
    });
    entrypoints.push(...files);
  }
  
  return [...new Set(entrypoints)];
}
