# Codebase Dashboard

## Live Codebase Architecture
 
 This interactive graph visualizes the current state of the Arela project.
 
 - **Nodes:** Files (Color-coded by type)
 - **Edges:** Dependency imports
 - **Size:** Code complexity
 
 *Data updates automatically ~5s after file changes.*

<script setup>
import CodebaseGraph from './.vitepress/components/CodebaseGraph.vue'
</script>

<CodebaseGraph />
