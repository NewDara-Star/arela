/**
 * Graph Slice - Operations
 * Handles Auto-Indexing for the Graph DB
 */
import path from "node:path";
import { indexCodebase } from "./indexer.js";

import { exportGraph } from "./export.js";

// Debounce timer
let updateTimer: NodeJS.Timeout | null = null;

export function startGraphWatcher(projectPath: string) {
    import("chokidar").then(({ watch }) => {
        console.error("🕸️  Starting Graph Auto-Indexer...");

        const watcher = watch("**/*.{ts,js}", {
            cwd: projectPath,
            ignored: ["**/node_modules/**", "**/dist/**", "**/.arela/**", "**/.git/**"],
            ignoreInitial: true,
            persistent: true
        });

        const handleUpdate = () => {
            if (updateTimer) clearTimeout(updateTimer);
            updateTimer = setTimeout(() => {
                console.error("🕸️  Graph changed. Re-indexing...");
                indexCodebase(projectPath)
                    .then(() => exportGraph())
                    .then(() => console.error("📊 Dashboard JSON updated."))
                    .catch(e => console.error("Graph update failed", e));
            }, 5000); // 5s debounce to avoid thrashing on massive saves
        };

        watcher.on("add", handleUpdate);
        watcher.on("change", handleUpdate);
        watcher.on("unlink", handleUpdate);
    });
}
