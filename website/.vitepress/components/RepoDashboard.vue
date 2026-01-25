<script setup>
import { ref, onMounted, computed } from 'vue'
import { withBase } from 'vitepress'
import CodebaseGraph from './CodebaseGraph.vue'

const data = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const res = await fetch(withBase(`/dashboard.json?t=${Date.now()}`))
    if (!res.ok) throw new Error(`Failed to load dashboard data: ${res.status} ${res.statusText}`)
    data.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const prdFeatures = computed(() => data.value?.prd?.features || [])
const tickets = computed(() => data.value?.tickets?.items || [])
const ticketStats = computed(() => data.value?.tickets?.byStatus || {})
const tests = computed(() => data.value?.tests?.features || [])
const changes = computed(() => data.value?.changes || null)
const system = computed(() => data.value?.system || null)
</script>

<template>
  <div class="repo-dashboard">
    <div v-if="loading" class="loading">Loading dashboard data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <section class="summary">
        <h2>Snapshot</h2>
        <div class="summary-grid">
          <div class="card">
            <div class="label">Files</div>
            <div class="value">{{ data.stats?.files ?? 0 }}</div>
          </div>
          <div class="card">
            <div class="label">Links</div>
            <div class="value">{{ data.stats?.links ?? 0 }}</div>
          </div>
          <div class="card">
            <div class="label">PRD Features</div>
            <div class="value">{{ prdFeatures.length }}</div>
          </div>
          <div class="card">
            <div class="label">Tickets</div>
            <div class="value">{{ tickets.length }}</div>
          </div>
          <div class="card">
            <div class="label">Tests</div>
            <div class="value">{{ tests.length }}</div>
          </div>
        </div>
        <div class="timestamp">Generated: {{ data.generated }}</div>
      </section>

      <section class="panel">
        <h2>Graph</h2>
        <CodebaseGraph :data="data" />
      </section>

      <section class="panel">
        <h2>PRD Features</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in prdFeatures" :key="f.id">
              <td>{{ f.id }}</td>
              <td>{{ f.name }}</td>
              <td>{{ f.status || 'unknown' }}</td>
              <td>{{ f.priority || 'n/a' }}</td>
            </tr>
            <tr v-if="prdFeatures.length === 0">
              <td colspan="4">No PRD features found.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Tickets</h2>
        <div class="pill-row">
          <span v-for="(count, status) in ticketStats" :key="status" class="pill">
            {{ status }}: {{ count }}
          </span>
          <span v-if="Object.keys(ticketStats).length === 0" class="pill">no tickets</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Feature</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id">
              <td>{{ t.id }}</td>
              <td>{{ t.status }}</td>
              <td>{{ t.featureId || '-' }}</td>
              <td>{{ t.path }}</td>
            </tr>
            <tr v-if="tickets.length === 0">
              <td colspan="4">No tickets found.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Tests</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Scenarios</th>
              <th>Status</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tests" :key="t.id">
              <td>{{ t.id }}</td>
              <td>{{ t.name }}</td>
              <td>{{ t.scenarios }}</td>
              <td>{{ t.status || 'unknown' }}</td>
              <td>{{ t.path }}</td>
            </tr>
            <tr v-if="tests.length === 0">
              <td colspan="5">No tests found.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Recent Changes</h2>
        <div v-if="!changes">
          No git history detected.
        </div>
        <div v-else class="changes-grid">
          <div>
            <h3>Working Tree</h3>
            <div class="changes">
              <div><strong>Modified:</strong> {{ changes.modified.length }}</div>
              <div><strong>Added:</strong> {{ changes.added.length }}</div>
              <div><strong>Deleted:</strong> {{ changes.deleted.length }}</div>
            </div>
          </div>
          <div>
            <h3>Recent Commits</h3>
            <ul>
              <li v-for="c in changes.commits" :key="c.hash">
                {{ c.hash }} — {{ c.message }} ({{ c.date }})
              </li>
              <li v-if="changes.commits.length === 0">No commits found.</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>System Health</h2>
        <div class="health-grid">
          <div>Graph DB: {{ system?.graphUpdatedAt || 'unknown' }}</div>
          <div>RAG Index: {{ system?.ragUpdatedAt || 'unknown' }}</div>
          <div>Ollama: {{ system?.ollama ? 'reachable' : 'offline' }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.repo-dashboard { margin-top: 1.5rem; }
.loading { color: var(--vp-c-text-2); }
.error { color: var(--vp-c-danger); }
.summary { margin-bottom: 2rem; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
.card { background: var(--vp-c-bg-alt); padding: 1rem; border-radius: 8px; }
.label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vp-c-text-2); }
.value { font-size: 1.6rem; font-weight: 700; }
.timestamp { margin-top: 0.75rem; color: var(--vp-c-text-2); font-size: 0.85rem; }
.panel { margin: 2rem 0; }
table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
th, td { border-bottom: 1px solid var(--vp-c-divider); padding: 0.5rem; text-align: left; }
.pill-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
.pill { background: var(--vp-c-bg-soft); padding: 0.3rem 0.6rem; border-radius: 999px; font-size: 0.8rem; }
.changes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.changes { display: grid; gap: 0.4rem; }
.health-grid { display: grid; gap: 0.4rem; }
</style>
