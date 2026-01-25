<script setup>
import { ref, onMounted, watch } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({
  data: { type: Object, default: null }
})

const data = ref(props.data)
const loading = ref(true)
const error = ref(null)
const mode = ref('mindmap') // 'mindmap' | 'graph'
const container = ref(null)

onMounted(async () => {
  try {
    if (!data.value) {
      // Load Data (with cache buster for live updates)
      const res = await fetch(withBase(`/dashboard.json?t=${Date.now()}`))
      if (!res.ok) throw new Error(`Failed to load dashboard data: ${res.status} ${res.statusText}`)
      data.value = await res.json()
    }

    // Load Mermaid
    const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')).default
    mermaid.initialize({ startOnLoad: false, theme: 'dark' })
    window.mermaid = mermaid

    renderChart()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

watch(() => props.data, (val) => {
  if (val) {
    data.value = val
    loading.value = false
    renderChart()
  }
})

async function renderChart() {
  if (!data.value || !container.value) return
  
  const mermaid = window.mermaid
  let definition = ''

  if (mode.value === 'mindmap') {
    definition = generateMindmap(data.value)
  } else {
    definition = generateDependencyGraph(data.value)
  }

  try {
    const { svg } = await mermaid.render('graphDiv', definition)
    container.value.innerHTML = svg
  } catch (e) {
    console.error('Mermaid render error:', e)
    container.value.innerHTML = `<div class="error">Render Error: ${e.message}</div>`
  }
}

function generateMindmap(json) {
  // Group files by directory
  const tree = {}
  json.nodes.forEach(node => {
    const parts = node.id.split('/')
    let current = tree
    parts.forEach((part, i) => {
      if (!current[part]) current[part] = (i === parts.length - 1) ? null : {}
      current = current[part]
    })
  })

  // Recursive generator
  function indent(level) { return '  '.repeat(level) }
  function walk(node, level) {
    let output = ''
    for (const key in node) {
      // Escape special chars
      const label = key.replace(/[\(\)\[\]]/g, '')
      output += `${indent(level)}${label}\n`
      if (node[key]) {
        output += walk(node[key], level + 1)
      }
    }
    return output
  }

  return `mindmap\n  root((Arela))\n${walk(tree, 2)}`
}

function generateDependencyGraph(json) {
  // Limit nodes for performance if too large?
  // mermaid fails with massive graphs. Let's show slice-level?
  // For now, raw files but maybe filter?
  
  let graph = 'graph TD\n'
  
  // Add nodes with styles
  // json.nodes.forEach(n => {
  //   graph += `  ${n.id}["${n.id.split('/').pop()}"]\n`
  // })

  // Add links
  json.links.forEach(l => {
     graph += `  ${sanitize(l.source)} --> ${sanitize(l.target)}\n`
  })

  return graph
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '_')
}

function toggleMode() {
  mode.value = mode.value === 'mindmap' ? 'graph' : 'mindmap'
  renderChart()
}
</script>

<template>
  <div class="dashboard">
    <div class="controls">
      <button @click="toggleMode">Switch to {{ mode === 'mindmap' ? 'Dependency Graph' : 'Mindmap' }}</button>
      <span v-if="data">Nodes: {{ data.stats.files }} | Links: {{ data.stats.links }}</span>
    </div>

    <div v-if="loading" class="loading">Loading graph data...</div>
    <div v-if="error" class="error">{{ error }}</div>
    
    <div ref="container" class="mermaid-container"></div>
  </div>
</template>

<style scoped>
.dashboard { margin-top: 2rem; }
.controls { margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; }
button { padding: 0.5rem 1rem; background: var(--vp-c-brand); color: white; border-radius: 4px; border: none; cursor: pointer; }
.mermaid-container { overflow: auto; background: var(--vp-c-bg-alt); padding: 1rem; border-radius: 8px; }
.error { color: var(--vp-c-danger); }
</style>
