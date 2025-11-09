import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import type { Finding } from "../types.js";
import { recordAssumption } from "../../configure/assumptions.js";

export interface AuditCheck {
  id: string;
  category: string;
  run(cwd: string): Promise<Finding | null>;
}

// Check 1: CI Doctor
export const ciDoctorCheck: AuditCheck = {
  id: "ci.missing_pr_eval",
  category: "governance",
  async run(cwd: string): Promise<Finding | null> {
    const workflowFiles = await glob(".github/workflows/*.{yml,yaml}", { cwd, nodir: true });
    
    if (workflowFiles.length === 0) {
      // Record assumption about CI
      await recordAssumption(cwd, {
        id: "ci.provider",
        assumption: "No CI provider detected",
        evidence: [".github/workflows/"],
        confidence: 0.9,
        status: "assumed",
      });
      
      return {
        id: this.id,
        severity: "high",
        category: this.category,
        why: "No CI workflows found - PRs skip all checks",
        evidence: [".github/workflows/"],
        fix: "Add GitHub Actions workflow with arela doctor --eval",
        autoFixable: true,
      };
    }
    
    // Record confirmed CI provider
    await recordAssumption(cwd, {
      id: "ci.provider",
      assumption: "GitHub Actions detected",
      evidence: workflowFiles,
      confidence: 1.0,
      status: "confirmed",
    });
    
    for (const file of workflowFiles) {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      if (content.includes("arela doctor") || content.includes("arela-doctor")) {
        return null; // Check passed
      }
    }
    
    return {
      id: this.id,
      severity: "high",
      category: this.category,
      why: "PRs skip Arela governance checks",
      evidence: workflowFiles.map(f => `${f}:1`),
      fix: "Add 'npx arela doctor --eval' step to PR workflow",
      autoFixable: true,
    };
  },
};

// Check 2: Pre-commit hooks
export const preCommitCheck: AuditCheck = {
  id: "git.missing_precommit",
  category: "governance",
  async run(cwd: string): Promise<Finding | null> {
    const huskyPath = path.join(cwd, ".husky", "pre-commit");
    
    if (!(await fs.pathExists(huskyPath))) {
      return {
        id: this.id,
        severity: "med",
        category: this.category,
        why: "No pre-commit hook to catch issues early",
        evidence: [".husky/pre-commit"],
        fix: "Install Husky and add arela doctor to pre-commit",
        autoFixable: true,
      };
    }
    
    const content = await fs.readFile(huskyPath, "utf8");
    if (!content.includes("arela doctor")) {
      return {
        id: this.id,
        severity: "med",
        category: this.category,
        why: "Pre-commit hook doesn't run Arela checks",
        evidence: [`${huskyPath}:1`],
        fix: "Add 'npx arela doctor' to pre-commit hook",
        autoFixable: true,
      };
    }
    
    return null;
  },
};

// Check 3: Test presence
export const testPresenceCheck: AuditCheck = {
  id: "test.missing_tests",
  category: "quality",
  async run(cwd: string): Promise<Finding | null> {
    const testPatterns = [
      "**/*.test.*",
      "**/*.spec.*",
      "**/__tests__/**/*.*",
      "**/test/**/*.*",
    ];
    
    let testFiles: string[] = [];
    for (const pattern of testPatterns) {
      const files = await glob(pattern, {
        cwd,
        ignore: ["node_modules/**", "dist/**", "build/**"],
        nodir: true,
      });
      testFiles.push(...files);
    }
    
    if (testFiles.length === 0) {
      return {
        id: this.id,
        severity: "high",
        category: this.category,
        why: "No test files found in repository",
        evidence: ["./"],
        fix: "Add test files following testing-pyramid or testing-trophy strategy",
        autoFixable: false,
      };
    }
    
    return null;
  },
};

// Check 4: Health check endpoint
export const healthCheckCheck: AuditCheck = {
  id: "obs.no_healthcheck",
  category: "observability",
  async run(cwd: string): Promise<Finding | null> {
    const entrypoints = await glob("**/main.{ts,js,py}", {
      cwd,
      ignore: ["node_modules/**", "dist/**"],
      nodir: true,
    });
    
    if (entrypoints.length === 0) {
      return null; // Not a service
    }
    
    for (const file of entrypoints) {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      if (content.includes("/health") || content.includes("healthcheck")) {
        return null; // Has health check
      }
    }
    
    return {
      id: this.id,
      severity: "med",
      category: this.category,
      why: "Service lacks /health endpoint for monitoring",
      evidence: entrypoints.map(f => `${f}:1-40`),
      fix: "Add GET /health endpoint and wire to CI smoke test",
      autoFixable: true,
    };
  },
};

// Check 5: Environment variables audit
export const envVarsCheck: AuditCheck = {
  id: "security.env_in_repo",
  category: "security",
  async run(cwd: string): Promise<Finding | null> {
    const envFiles = await glob("**/.env", {
      cwd,
      ignore: ["node_modules/**"],
      nodir: true,
      dot: true,
    });
    
    const violations: string[] = [];
    
    for (const file of envFiles) {
      if (!file.includes(".example") && !file.includes(".template")) {
        violations.push(file);
      }
    }
    
    if (violations.length > 0) {
      return {
        id: this.id,
        severity: "critical",
        category: this.category,
        why: "Environment files with secrets committed to repo",
        evidence: violations,
        fix: "Remove .env files, add to .gitignore, use .env.example instead",
        autoFixable: false,
      };
    }
    
    return null;
  },
};

// Check 6: Logging middleware
export const loggingCheck: AuditCheck = {
  id: "obs.no_structured_logging",
  category: "observability",
  async run(cwd: string): Promise<Finding | null> {
    const pkgPath = path.join(cwd, "package.json");
    
    if (!(await fs.pathExists(pkgPath))) {
      return null;
    }
    
    const pkg = await fs.readJson(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const loggingLibs = ["winston", "pino", "bunyan", "log4js"];
    const hasLogging = loggingLibs.some(lib => deps[lib]);
    
    if (!hasLogging) {
      return {
        id: this.id,
        severity: "med",
        category: this.category,
        why: "No structured logging library detected",
        evidence: ["package.json:1"],
        fix: "Add winston or pino for structured JSON logging",
        autoFixable: true,
      };
    }
    
    return null;
  },
};

// Check 7: CORS configuration
export const corsCheck: AuditCheck = {
  id: "security.weak_cors",
  category: "security",
  async run(cwd: string): Promise<Finding | null> {
    const serverFiles = await glob("**/server.{ts,js}", {
      cwd,
      ignore: ["node_modules/**"],
      nodir: true,
    });
    
    for (const file of serverFiles) {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      
      if (content.includes("cors()") && content.includes("origin: '*'")) {
        return {
          id: this.id,
          severity: "high",
          category: this.category,
          why: "CORS allows all origins (*) - security risk",
          evidence: [`${file}:1`],
          fix: "Restrict CORS to specific origins",
          autoFixable: false,
        };
      }
    }
    
    return null;
  },
};

// Check 8: Database migrations
export const migrationsCheck: AuditCheck = {
  id: "data.no_migrations",
  category: "data",
  async run(cwd: string): Promise<Finding | null> {
    const hasPrisma = await fs.pathExists(path.join(cwd, "prisma"));
    const hasMigrations = await fs.pathExists(path.join(cwd, "migrations"));
    
    const pkgPath = path.join(cwd, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const hasDB = deps.pg || deps.mysql || deps.mongodb;
      
      if (hasDB && !hasPrisma && !hasMigrations) {
        return {
          id: this.id,
          severity: "med",
          category: this.category,
          why: "Database detected but no migration system found",
          evidence: ["package.json:1"],
          fix: "Add Prisma or migration tool for schema versioning",
          autoFixable: false,
        };
      }
    }
    
    return null;
  },
};

// Check 9: Docker reproducibility
export const dockerCheck: AuditCheck = {
  id: "infra.docker_not_pinned",
  category: "infrastructure",
  async run(cwd: string): Promise<Finding | null> {
    const dockerfilePath = path.join(cwd, "Dockerfile");
    
    if (!(await fs.pathExists(dockerfilePath))) {
      return null;
    }
    
    const content = await fs.readFile(dockerfilePath, "utf8");
    
    if (content.includes("FROM") && content.includes(":latest")) {
      return {
        id: this.id,
        severity: "med",
        category: this.category,
        why: "Dockerfile uses :latest tag - not reproducible",
        evidence: ["Dockerfile:1"],
        fix: "Pin base image to specific version",
        autoFixable: false,
      };
    }
    
    return null;
  },
};

// Check 10: Rate limiting
export const rateLimitCheck: AuditCheck = {
  id: "security.no_rate_limit",
  category: "security",
  async run(cwd: string): Promise<Finding | null> {
    const serverFiles = await glob("**/server.{ts,js}", {
      cwd,
      ignore: ["node_modules/**"],
      nodir: true,
    });
    
    for (const file of serverFiles) {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      
      if (content.includes("express") || content.includes("fastify")) {
        if (!content.includes("rate-limit") && !content.includes("rateLimit")) {
          return {
            id: this.id,
            severity: "med",
            category: this.category,
            why: "API server lacks rate limiting",
            evidence: [`${file}:1`],
            fix: "Add express-rate-limit or equivalent middleware",
            autoFixable: true,
          };
        }
      }
    }
    
    return null;
  },
};

// Check 11: API contract drift
export const apiContractCheck: AuditCheck = {
  id: "api.no_openapi",
  category: "api",
  async run(cwd: string): Promise<Finding | null> {
    const hasOpenAPI = await fs.pathExists(path.join(cwd, "openapi.yaml")) ||
                       await fs.pathExists(path.join(cwd, "openapi.json")) ||
                       await fs.pathExists(path.join(cwd, "swagger.yaml"));
    
    const hasAPI = await glob("**/routes/**/*.{ts,js}", {
      cwd,
      ignore: ["node_modules/**"],
      nodir: true,
    });
    
    if (hasAPI.length > 0 && !hasOpenAPI) {
      return {
        id: this.id,
        severity: "low",
        category: this.category,
        why: "API routes found but no OpenAPI spec",
        evidence: ["./routes/"],
        fix: "Add OpenAPI/Swagger spec for API documentation",
        autoFixable: false,
      };
    }
    
    return null;
  },
};

// Check 12: Feature flags documentation
export const featureFlagsCheck: AuditCheck = {
  id: "docs.no_feature_flags_doc",
  category: "documentation",
  async run(cwd: string): Promise<Finding | null> {
    const codeFiles = await glob("**/*.{ts,js}", {
      cwd,
      ignore: ["node_modules/**", "dist/**"],
      nodir: true,
    });
    
    let hasFeatureFlags = false;
    for (const file of codeFiles) {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      if (content.includes("featureFlag") || content.includes("feature_flag")) {
        hasFeatureFlags = true;
        break;
      }
    }
    
    if (hasFeatureFlags) {
      const hasDoc = await fs.pathExists(path.join(cwd, "docs", "feature-flags.md")) ||
                     await fs.pathExists(path.join(cwd, "FEATURE_FLAGS.md"));
      
      if (!hasDoc) {
        return {
          id: this.id,
          severity: "low",
          category: this.category,
          why: "Feature flags used but not documented",
          evidence: ["./"],
          fix: "Add docs/feature-flags.md documenting all flags",
          autoFixable: false,
        };
      }
    }
    
    return null;
  },
};

export const ALL_CHECKS: AuditCheck[] = [
  ciDoctorCheck,
  preCommitCheck,
  testPresenceCheck,
  healthCheckCheck,
  envVarsCheck,
  loggingCheck,
  corsCheck,
  migrationsCheck,
  dockerCheck,
  rateLimitCheck,
  apiContractCheck,
  featureFlagsCheck,
];
