
/**
 * Graph Export Script
 * Generates dashboard.json for the documentation site.
 */

import path from 'node:path';
import fs from 'fs-extra';
import { GraphDB } from './db.js';

async function exportGraph() {
    const projectRoot = process.cwd();
    const db = new GraphDB(projectRoot);

    try {
        console.log('📊 Exporting graph data...');

        const files = db.getFiles();
        const imports = db.getAllImports();

        const data = {
            generated: new Date().toISOString(),
            stats: {
                files: files.length,
                links: imports.length
            },
            nodes: files.map(f => ({
                id: f.path,
                group: f.path.split('/')[0] || 'root' // Top-level folder as group
            })),
            links: imports.map(i => ({
                source: i.source,
                target: i.target
            }))
        };

        const outputDir = path.join(projectRoot, 'website/public');
        await fs.ensureDir(outputDir);

        const outputPath = path.join(outputDir, 'dashboard.json');
        await fs.writeJSON(outputPath, data, { spaces: 2 });

        console.log(`✅ Graph exported to ${outputPath}`);
        console.log(`   - ${files.length} nodes`);
        console.log(`   - ${imports.length} links`);

    } catch (error) {
        console.error('❌ Graph export failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run if called directly
const isMain = process.argv[1] === import.meta.filename || process.argv[1].endsWith('export.ts');
if (isMain) {
    exportGraph();
}

export { exportGraph };
