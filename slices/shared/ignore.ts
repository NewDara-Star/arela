import fs from "fs-extra";
import path from "node:path";

const DEFAULT_IGNORE_GLOBS = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/.arela/**"
];

type IgnoreCache = {
    projectPath: string;
    mtimeMs: number;
    globs: string[];
};

let cache: IgnoreCache | null = null;

function normalizePattern(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return null;
    if (trimmed.startsWith("!")) return null; // Negation not supported (yet)

    let pattern = trimmed.replace(/\\/g, "/");
    const anchored = pattern.startsWith("/");
    if (anchored) pattern = pattern.slice(1);
    if (pattern.endsWith("/")) pattern = pattern + "**";
    if (!anchored && !pattern.includes("/")) {
        pattern = `**/${pattern}`;
    }
    return pattern;
}

async function readArelIgnore(projectPath: string): Promise<string[]> {
    const ignorePath = path.join(projectPath, ".arelaignore");
    if (!await fs.pathExists(ignorePath)) return [];

    const raw = await fs.readFile(ignorePath, "utf-8");
    return raw
        .split(/\r?\n/)
        .map(normalizePattern)
        .filter((p): p is string => !!p);
}

export async function getIgnoreGlobs(projectPath: string): Promise<string[]> {
    const ignorePath = path.join(projectPath, ".arelaignore");
    const stat = await fs.stat(ignorePath).catch(() => null);
    const mtimeMs = stat?.mtimeMs ?? 0;

    if (cache && cache.projectPath === projectPath && cache.mtimeMs === mtimeMs) {
        return cache.globs;
    }

    const userGlobs = await readArelIgnore(projectPath);
    const globs = [...DEFAULT_IGNORE_GLOBS, ...userGlobs];
    cache = { projectPath, mtimeMs, globs };
    return globs;
}

function globToRegExp(glob: string): RegExp {
    let out = "^";
    let i = 0;
    while (i < glob.length) {
        const ch = glob[i];
        if (ch === "*") {
            if (glob[i + 1] === "*") {
                out += ".*";
                i += 2;
                continue;
            }
            out += "[^/]*";
            i += 1;
            continue;
        }
        if (ch === "?") {
            out += ".";
            i += 1;
            continue;
        }
        out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
        i += 1;
    }
    out += "$";
    return new RegExp(out);
}

export function shouldIgnorePath(relativePath: string, ignoreGlobs: string[]): boolean {
    const normalized = relativePath.split(path.sep).join("/");
    return ignoreGlobs.some(glob => globToRegExp(glob).test(normalized));
}
