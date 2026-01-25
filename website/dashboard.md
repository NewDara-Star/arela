# Repo Dashboard

This dashboard is the **live mirror** of a repo’s current state:
- Graph (dependencies)
- PRD features (status + priority)
- Tickets
- Tests + last run status
- Recent changes
- System health

*Data updates automatically ~5s after file changes.*

## How It Works

- `slices/dashboard/export.ts` writes `.arela/dashboard.json` and `website/public/dashboard.json`
- The dashboard fetches that JSON on load (cache‑busted)
- When the MCP server is running, watchers re‑export after file changes

## Important

- `arela init` **scaffolds** the dashboard site into each repo (Option A).
- The dashboard is **per‑repo** and reads local data only (metadata by default).

<script setup>
import RepoDashboard from './.vitepress/components/RepoDashboard.vue'
</script>

<RepoDashboard />
