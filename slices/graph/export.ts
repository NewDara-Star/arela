
/**
 * Graph Export Script (legacy)
 * Delegates to the full dashboard exporter.
 */

import { exportDashboard } from "../dashboard/export.js";

async function exportGraph() {
    const projectRoot = process.cwd();
    try {
        console.error("📊 Exporting dashboard data...");
        await exportDashboard(projectRoot);
        console.error("✅ Dashboard exported.");
    } catch (error) {
        console.error("❌ Dashboard export failed:", error);
        process.exit(1);
    }
}

// Run if called directly
const isMain = process.argv[1] === import.meta.filename || process.argv[1].endsWith('export.ts');
if (isMain) {
    exportGraph();
}

export { exportGraph };
