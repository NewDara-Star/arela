import { exportDashboard } from "./export.js";

let updateTimer: NodeJS.Timeout | null = null;

export function startDashboardWatcher(projectPath: string) {
    import("chokidar").then(({ watch }) => {
        console.error("📊 Starting Dashboard Watcher...");

        const watcher = watch([
            "spec/prd.json",
            "spec/stack.json",
            "spec/tickets/**/*.md",
            "spec/tests/**/*.feature",
            "specs/prd.json",
            "specs/stack.json",
            "specs/tickets/**/*.md",
            "specs/tests/**/*.feature",
            ".arela/test-results.json"
        ], {
            cwd: projectPath,
            ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
            ignoreInitial: true,
            persistent: true
        });

        const handleUpdate = () => {
            if (updateTimer) clearTimeout(updateTimer);
            updateTimer = setTimeout(() => {
                exportDashboard(projectPath)
                    .then(() => console.error("📊 Dashboard JSON updated."))
                    .catch(e => console.error("Dashboard update failed", e));
            }, 2000);
        };

        watcher.on("add", handleUpdate);
        watcher.on("change", handleUpdate);
        watcher.on("unlink", handleUpdate);
    });
}
