import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import { parsePRD, extractUserStories } from "./parser.js";
import {
    ParsedPRD,
    PRDSummary,
    PRDFrontmatter,
    UserStory,
    PRDType,
    PRDStatus,
    PRDPriority
} from "./types.js";

const CWD = process.env.CWD || process.cwd();

/**
 * List all PRD files in the project
 */
export async function listPRDs(): Promise<PRDSummary[]> {
    const prdPaths = await glob("**/*.prd.md", {
        cwd: CWD,
        ignore: ["node_modules/**", "dist/**"]
    });

    // Also check templates/ and prds/ directories
    const templatePaths = await glob("templates/**/*.md", {
        cwd: CWD,
        ignore: ["node_modules/**"]
    });

    const prdDirPaths = await glob("prds/**/*.md", {
        cwd: CWD,
        ignore: ["node_modules/**"]
    });

    const allPaths = [...new Set([...prdPaths, ...prdDirPaths])];

    const summaries: PRDSummary[] = [];

    for (const prdPath of allPaths) {
        try {
            const fullPath = path.resolve(CWD, prdPath);
            const content = await fs.readFile(fullPath, "utf-8");
            const prd = parsePRD(content, prdPath);

            summaries.push({
                path: prdPath,
                id: prd.frontmatter.id,
                title: prd.title,
                type: prd.frontmatter.type,
                status: prd.frontmatter.status,
                priority: prd.frontmatter.priority,
                updated: prd.frontmatter.updated,
            });
        } catch (err) {
            console.warn(`Failed to parse PRD at ${prdPath}:`, err);
        }
    }

    return summaries;
}

/**
 * Parse a specific PRD file
 */
export async function getPRD(prdPath: string): Promise<ParsedPRD> {
    const fullPath = path.resolve(CWD, prdPath);
    const content = await fs.readFile(fullPath, "utf-8");
    return parsePRD(content, prdPath);
}

/**
 * Get the status of a PRD
 */
export async function getPRDStatus(prdPath: string): Promise<{
    id: string;
    status: PRDStatus;
    type: PRDType;
    priority: PRDPriority;
    userStoryCount: number;
    sections: string[];
}> {
    const prd = await getPRD(prdPath);
    const userStories = extractUserStories(prd);

    return {
        id: prd.frontmatter.id,
        status: prd.frontmatter.status,
        type: prd.frontmatter.type,
        priority: prd.frontmatter.priority,
        userStoryCount: userStories.length,
        sections: prd.sections.map(s => s.header),
    };
}

/**
 * Create a new PRD from template
 */
export async function createPRD(options: {
    id: string;
    title: string;
    type: PRDType;
    outputPath?: string;
}): Promise<string> {
    const templatePath = path.resolve(CWD, "templates/PRD.md");

    let template: string;
    if (await fs.pathExists(templatePath)) {
        template = await fs.readFile(templatePath, "utf-8");
    } else {
        // Fallback minimal template
        template = `---
id: ${options.id}
title: "${options.title}"
type: ${options.type}
status: draft
priority: medium
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString().split('T')[0]}
context: []
tools: []
---

# ${options.title}

## Summary

[Describe the feature]

## User Stories

### US-001: [Story Title]

**As a** [user type],  
**I want** [goal],  
**So that** [benefit].

**Acceptance Criteria:**
- [ ] Given [precondition], When [action], Then [result]
`;
    }

    // Replace placeholders
    const today = new Date().toISOString().split('T')[0];
    let content = template
        .replace(/id:\s*REQ-XXX/g, `id: ${options.id}`)
        .replace(/title:\s*"[^"]*"/g, `title: "${options.title}"`)
        .replace(/type:\s*feature/g, `type: ${options.type}`)
        .replace(/created:\s*\d{4}-\d{2}-\d{2}/g, `created: ${today}`)
        .replace(/updated:\s*\d{4}-\d{2}-\d{2}/g, `updated: ${today}`)
        .replace(/# Feature Title/g, `# ${options.title}`);

    // Write to output path if specified
    if (options.outputPath) {
        const fullPath = path.resolve(CWD, options.outputPath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content, "utf-8");
        return `PRD created at ${options.outputPath}`;
    }

    return content;
}

/**
 * Extract user stories from a PRD file
 */
export async function getUserStories(prdPath: string): Promise<UserStory[]> {
    const prd = await getPRD(prdPath);
    return extractUserStories(prd);
}

/**
 * Update PRD status
 */
export async function updatePRDStatus(
    prdPath: string,
    newStatus: PRDStatus
): Promise<string> {
    const fullPath = path.resolve(CWD, prdPath);
    const content = await fs.readFile(fullPath, "utf-8");

    const today = new Date().toISOString().split('T')[0];

    // Update status and updated date in frontmatter
    const updated = content
        .replace(/status:\s*(draft|approved|implemented|verified)/g, `status: ${newStatus}`)
        .replace(/updated:\s*\d{4}-\d{2}-\d{2}/g, `updated: ${today}`);

    await fs.writeFile(fullPath, updated, "utf-8");

    return `PRD status updated to ${newStatus}`;
}
