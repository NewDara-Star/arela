/**
 * Graph Slice - Gatekeeper (API)
 */

import { GraphDB } from "./db.js";
import { indexCodebase } from "./indexer.js";

export interface ImpactAnalysis {
    file: string;
    upstream: string[];   // What files verify this file
    downstream: string[]; // What files this file depends on
}

export async function analyzeImpact(projectPath: string, relativePath: string): Promise<ImpactAnalysis | null> {
    const db = new GraphDB(projectPath);

    const fileId = db.getFileId(relativePath);
    if (!fileId) {
        db.close();
        return null;
    }

    const upstream = db.getUpstream(fileId).map(f => f.path);
    const downstream = db.getDownstream(fileId).map(f => f.path);

    db.close();

    return {
        file: relativePath,
        upstream,
        downstream
    };
}

export async function refreshGraph(projectPath: string): Promise<number> {
    return await indexCodebase(projectPath);
}
