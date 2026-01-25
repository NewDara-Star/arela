import path from "node:path";
import fs from "fs-extra";
import { execa } from "execa";
import { glob } from "glob";
import { GraphDB } from "../graph/db.js";
import { getJsonPRD } from "../prd/ops.js";
import type { DashboardData } from "./types.js";

const SPEC_DIR = "spec";
const LEGACY_SPEC_DIR = "specs";

function resolveSpecDir(projectPath: string): string {
    const preferred = path.join(projectPath, SPEC_DIR);
    if (fs.existsSync(preferred)) return preferred;
    const legacy = path.join(projectPath, LEGACY_SPEC_DIR);
    if (fs.existsSync(legacy)) return legacy;
    return preferred;
}

function parseFrontmatter(text: string): Record<string, string> {
    const lines = text.split(/\r?\n/);
    if (lines[0]?.trim() !== "---") return {};
    const endIndex = lines.slice(1).findIndex(l => l.trim() === "---");
    if (endIndex === -1) return {};
    const frontmatterLines = lines.slice(1, endIndex + 1);
    const data: Record<string, string> = {};
    for (const line of frontmatterLines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key) data[key] = value;
    }
    return data;
}

function countScenarios(featureText: string): number {
    const lines = featureText.split(/\r?\n/);
    return lines.filter(l => l.trim().startsWith("Scenario")).length;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
    if (!await fs.pathExists(filePath)) return null;
    try {
        return await fs.readJson(filePath) as T;
    } catch {
        return null;
    }
}

async function getRecentChanges(projectPath: string): Promise<DashboardData["changes"]> {
    const gitDir = path.join(projectPath, ".git");
    if (!await fs.pathExists(gitDir)) return undefined;

    try {
        const statusResult = await execa("git", ["status", "--porcelain"], { cwd: projectPath, reject: false });
        const modified: string[] = [];
        const added: string[] = [];
        const deleted: string[] = [];

        for (const line of statusResult.stdout.split(/\r?\n/).filter(Boolean)) {
            const status = line.slice(0, 2).trim();
            const file = line.slice(3).trim();
            if (!file) continue;
            if (status.includes("A")) added.push(file);
            else if (status.includes("D")) deleted.push(file);
            else modified.push(file);
        }

        const logResult = await execa("git", ["log", "-n", "10", "--pretty=format:%h\t%ad\t%s", "--date=iso"], { cwd: projectPath, reject: false });
        const commits = logResult.stdout
            .split(/\r?\n/)
            .filter(Boolean)
            .map(line => {
                const [hash, date, message] = line.split("\t");
                return { hash, date, message };
            });

        return { modified, added, deleted, commits };
    } catch {
        return undefined;
    }
}

async function isOllamaReachable(): Promise<boolean> {
    try {
        const res = await fetch("http://localhost:11434/api/tags");
        return res.ok;
    } catch {
        return false;
    }
}

export async function exportDashboard(projectPath: string): Promise<DashboardData> {
    const db = await GraphDB.create(projectPath);
    const files = db.getFiles();
    const imports = db.getAllImports();

    const data: DashboardData = {
        generated: new Date().toISOString(),
        stats: {
            files: files.length,
            links: imports.length
        },
        nodes: files.map(f => ({
            id: f.path,
            group: f.path.split("/")[0] || "root"
        })),
        links: imports.map(i => ({
            source: i.source,
            target: i.target,
            type: (i as any).type
        }))
    };

    db.close();

    // PRD
    const specDir = resolveSpecDir(projectPath);
    const specBase = path.basename(specDir);
    const prdPath = path.join(specDir, "prd.json");
    const prd = await readJsonIfExists<any>(prdPath);
    if (prd) {
        try {
            const parsed = await getJsonPRD(prdPath);
            data.prd = {
                path: path.relative(projectPath, prdPath).split(path.sep).join("/"),
                features: parsed.features.map(f => ({
                    id: f.id,
                    name: f.name,
                    status: (f as any).status,
                    priority: f.priority,
                    alignment: (f as any).alignment
                }))
            };
        } catch {
            data.prd = {
                path: path.relative(projectPath, prdPath).split(path.sep).join("/"),
                features: []
            };
        }
    }

    // Tickets
    const ticketsDir = path.join(specDir, "tickets");
    if (await fs.pathExists(ticketsDir)) {
        const ticketFiles = await glob("**/*.md", { cwd: ticketsDir });
        const items: Array<{
            id: string;
            status: string;
            featureId?: string;
            path: string;
        }> = [];
        const byStatus: Record<string, number> = {};

        for (const file of ticketFiles) {
            const full = path.join(ticketsDir, file);
            const text = await fs.readFile(full, "utf-8");
            const fm = parseFrontmatter(text);
            const id = fm.id || path.basename(file, ".md");
            const status = (fm.status || "open").toLowerCase();
            const featureId = fm.feature;

            items.push({
                id,
                status,
                featureId,
                path: path.join(specBase, "tickets", file).split(path.sep).join("/")
            });
            byStatus[status] = (byStatus[status] || 0) + 1;
        }

        data.tickets = {
            path: path.relative(projectPath, ticketsDir).split(path.sep).join("/"),
            total: items.length,
            byStatus,
            items
        };
    }

    // Tests
    const testsDir = path.join(specDir, "tests", "features");
    const resultsPath = path.join(projectPath, ".arela", "test-results.json");
    const results = await readJsonIfExists<{ results: Array<{ featurePath: string; success: boolean; durationMs: number; timestamp: string }> }>(resultsPath);
    const resultList = results?.results ?? [];
    const resultMap = new Map(resultList.map(r => [r.featurePath, r]));

    if (await fs.pathExists(testsDir)) {
        const featureFiles = await glob("**/*.feature", { cwd: testsDir });
        const features: Array<{
            id: string;
            name: string;
            scenarios: number;
            path: string;
            status?: string;
        }> = [];

        for (const file of featureFiles) {
            const full = path.join(testsDir, file);
            const text = await fs.readFile(full, "utf-8");
            const nameMatch = text.split(/\r?\n/).find(l => l.trim().startsWith("Feature:"));
            const name = nameMatch ? nameMatch.replace("Feature:", "").trim() : path.basename(file, ".feature");
            const relativeFeaturePath = path.join(specBase, "tests", "features", file).split(path.sep).join("/");
            const legacyFeaturePath = path.join("tests", "features", file).split(path.sep).join("/");
            const result = resultMap.get(relativeFeaturePath) || resultMap.get(legacyFeaturePath);

            features.push({
                id: path.basename(file, ".feature"),
                name,
                scenarios: countScenarios(text),
                path: relativeFeaturePath,
                status: result ? (result.success ? "passed" : "failed") : "unknown"
            });
        }

        data.tests = {
            path: path.relative(projectPath, testsDir).split(path.sep).join("/"),
            total: features.length,
            features,
            results: resultList
        };
    }

    // Changes
    data.changes = await getRecentChanges(projectPath);

    // System health
    const graphDbPath = path.join(projectPath, ".arela", "graph.db");
    const ragIndexPath = path.join(projectPath, ".arela", ".rag-index.json");
    const graphStat = await fs.stat(graphDbPath).catch(() => null);
    const ragStat = await fs.stat(ragIndexPath).catch(() => null);
    data.system = {
        graphUpdatedAt: graphStat?.mtime?.toISOString(),
        ragUpdatedAt: ragStat?.mtime?.toISOString(),
        ollama: await isOllamaReachable()
    };

    // Write outputs
    const arelaDir = path.join(projectPath, ".arela");
    await fs.ensureDir(arelaDir);
    const dashboardPath = path.join(arelaDir, "dashboard.json");
    await fs.writeJson(dashboardPath, data, { spaces: 2 });

    const publicDir = path.join(projectPath, "website", "public");
    if (await fs.pathExists(publicDir)) {
        await fs.ensureDir(publicDir);
        await fs.writeJson(path.join(publicDir, "dashboard.json"), data, { spaces: 2 });
    }

    return data;
}

// Run if called directly
const isMain = process.argv[1] === import.meta.filename || process.argv[1].endsWith("export.ts");
if (isMain) {
    exportDashboard(process.cwd())
        .then(() => {
            console.error("✅ Dashboard exported.");
        })
        .catch((e) => {
            console.error("❌ Dashboard export failed:", e);
            process.exit(1);
        });
}
