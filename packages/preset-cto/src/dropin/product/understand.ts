import fs from "fs-extra";
import path from "path";

export interface ProductProfile {
  name: string;
  domain?: string;
  targets: string[];
  auth: string[];
  db: string[];
  services: string[];
  assumptions: string[];
  risks: string[];
}

export async function extractProductProfile(cwd: string): Promise<ProductProfile> {
  const profile: ProductProfile = {
    name: path.basename(cwd),
    targets: [],
    auth: [],
    db: [],
    services: [],
    assumptions: [],
    risks: [],
  };
  
  // Read package.json
  const pkgPath = path.join(cwd, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    
    if (pkg.name) {
      profile.name = pkg.name;
    }
    
    if (pkg.description) {
      profile.domain = inferDomain(pkg.description);
    }
    
    // Detect targets from dependencies
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps["react-native"] || deps["expo"]) {
      profile.targets.push("mobile");
    }
    if (deps["react"] || deps["next"] || deps["vue"]) {
      profile.targets.push("web");
    }
    if (deps["express"] || deps["fastify"] || deps["@nestjs/core"]) {
      profile.targets.push("api");
    }
    
    // Detect auth
    if (deps["@supabase/supabase-js"]) {
      profile.auth.push("Supabase");
    }
    if (deps["next-auth"] || deps["@auth/core"]) {
      profile.auth.push("NextAuth");
    }
    if (deps["passport"]) {
      profile.auth.push("Passport");
    }
    
    // Detect databases
    if (deps["pg"] || deps["postgres"]) {
      profile.db.push("Postgres");
    }
    if (deps["mysql"] || deps["mysql2"]) {
      profile.db.push("MySQL");
    }
    if (deps["mongodb"]) {
      profile.db.push("MongoDB");
    }
    if (deps["redis"]) {
      profile.db.push("Redis");
    }
    if (deps["@supabase/supabase-js"]) {
      profile.db.push("Supabase");
    }
    if (deps["prisma"]) {
      profile.db.push("Prisma");
    }
  }
  
  // Read README
  const readmePath = path.join(cwd, "README.md");
  if (await fs.pathExists(readmePath)) {
    const readme = await fs.readFile(readmePath, "utf8");
    
    if (!profile.domain) {
      profile.domain = inferDomain(readme);
    }
  }
  
  // Check for Docker Compose services
  const composePath = path.join(cwd, "docker-compose.yml");
  if (await fs.pathExists(composePath)) {
    const compose = await fs.readFile(composePath, "utf8");
    
    // Simple service extraction
    const serviceMatches = compose.matchAll(/^\s{2}(\w+):/gm);
    for (const match of serviceMatches) {
      const serviceName = match[1];
      if (!["version", "services", "networks", "volumes"].includes(serviceName)) {
        profile.services.push(serviceName);
      }
    }
  }
  
  // Detect assumptions
  if (profile.targets.includes("mobile")) {
    profile.assumptions.push("offline-first");
  }
  
  // Detect risks
  if (profile.targets.includes("api") && profile.auth.length === 0) {
    profile.risks.push("no auth detected on API");
  }
  
  if (profile.db.includes("Supabase") && profile.auth.includes("Supabase")) {
    // Check for RLS mention in docs
    const hasRLS = await checkForRLS(cwd);
    if (!hasRLS) {
      profile.risks.push("Supabase without RLS documentation");
    }
  }
  
  return profile;
}

function inferDomain(text: string): string | undefined {
  const lower = text.toLowerCase();
  
  const domains: Record<string, string[]> = {
    "fitness": ["fitness", "workout", "exercise", "health", "gym"],
    "ecommerce": ["shop", "store", "cart", "checkout", "product"],
    "social": ["social", "chat", "message", "post", "feed"],
    "finance": ["finance", "payment", "transaction", "banking"],
    "education": ["education", "learning", "course", "student"],
    "productivity": ["task", "todo", "project", "note"],
  };
  
  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return domain;
    }
  }
  
  return undefined;
}

async function checkForRLS(cwd: string): Promise<boolean> {
  const docsPath = path.join(cwd, "docs");
  
  if (!(await fs.pathExists(docsPath))) {
    return false;
  }
  
  const files = await fs.readdir(docsPath);
  
  for (const file of files) {
    if (file.endsWith(".md")) {
      const content = await fs.readFile(path.join(docsPath, file), "utf8");
      if (content.toLowerCase().includes("rls") || content.toLowerCase().includes("row level security")) {
        return true;
      }
    }
  }
  
  return false;
}

export async function saveProductProfile(cwd: string, profile: ProductProfile): Promise<void> {
  const profilePath = path.join(cwd, ".arela", "product.json");
  await fs.ensureDir(path.dirname(profilePath));
  await fs.writeJson(profilePath, profile, { spaces: 2 });
}

export async function loadProductProfile(cwd: string): Promise<ProductProfile | null> {
  const profilePath = path.join(cwd, ".arela", "product.json");
  
  if (!(await fs.pathExists(profilePath))) {
    return null;
  }
  
  return await fs.readJson(profilePath);
}
