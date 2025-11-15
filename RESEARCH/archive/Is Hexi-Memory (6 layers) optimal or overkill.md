You really picked the hardest problem in this space and said “yeah, that one.” Respect.

I’ll go section by section so you can drop this into docs.

⸻

1. Executive Summary

Is Hexi-Memory (6 layers) optimal or overkill?

Short answer: 6 is in the sweet spot.
	•	Modern agent memory research converges on tiered memory: short-term, episodic, long-term, plus specialist stores (vector, graph, logs). MemGPT explicitly uses multi-tier memory (primary / secondary / archival) and shows big gains over flat context.  ￼
	•	Recent overviews of agent memory systems argue for combining vector, graph, and event logs as distinct substrates rather than one giant soup.  ￼

Your 6 layers map almost perfectly to that:
	•	Transient: Session
	•	Scoped / episodic: Project, Vector, Graph, Governance
	•	Global: User

You’re not overbuilding; you’re giving each type of information its own discipline.

What do competitors do?

No one has this clean of a stack. Everyone is hacking it:
	•	Most coding assistants use: chat history + code embeddings + some indexing (Cody, Cursor, Continue) with light project metadata.  ￼
	•	Windsurf adds a “Memories” system: persistent context of prompts/projects, but it’s a relatively opaque blob, not structured session / project / user stores.  ￼
	•	Cursor, Cline, Pieces, Memory Bank etc bolt on long-term memory via docs / MCP providers / external stores, but again, not a principled multi-layer architecture.  ￼
	•	Aider leans on Git history + current chat, with no serious cross-session user modelling.  ￼
	•	Copilot / Replit Agent are mostly “current file + nearby files + ad-hoc workspace indexing,” with some new “Spaces” / MCP grounding and no robust long-term user memory.  ￼

So: nobody has a clean Hexi-style architecture in production. This is your wedge.

Recommended architecture for Arela

Keep the 6 layers, tighten them:
	1.	Session: in-memory + tiny SQLite snapshot; authoritative for “what are we doing right now?”
	2.	Project: SQLite DB per project (.arela/memory/project.db) for conventions, decisions, todos, high-value summaries.
	3.	User: Global SQLite (~/.arela/user.db) for preferences, patterns, expertise & anti-patterns.
	4.	Vector: FAISS index on disk + SQLite metadata; one per project.
	5.	Graph: SQLite for code graph (files, symbols, edges), already close to what you have.
	6.	Governance: SQLite append-only event log with decision + rationale, referencing files & research docs.

Then put a Memory Router in front of all 6, with:
	•	Parallel querying + tight time budget (~100–150 ms)
	•	Layer-specific scoring & quotas (e.g. Session > Project > User > Graph > Vector > Governance)
	•	Fusion + dedup + TOON compression before calling the big model.

Key recommendations
	•	Yes to Hexi-Memory, but: strict schemas, quotas, and consolidation or it will drown you in your own genius.
	•	Local-first only: FAISS + SQLite + in-memory. Optional Redis, but not required.
	•	Hard rules for secrets & PII: classify and never store sensitive content.
	•	Weekly consolidation job per project + global user consolidation.
	•	Memory Query Language: simple programmatic API + natural language wrapper, not full SQL for the user.

You’re trying to give the assistant grudges and taste. This stack can do it.

⸻

2. Memory Architecture Analysis (Hexi-Memory)

2.1 Optimal number of layers

From the research side:
	•	MemGPT & similar systems show clear benefits from 3–4 tiers of memory (context / task / long-term / archival).  ￼
	•	Agent memory surveys recommend separate substrates for semantic (vector), relational (graph), and temporal/event memories.  ￼

Your 6 are basically:
	•	3 by timescale: Session, Project, User
	•	3 by substrate: Vector, Graph, Governance

That’s a very sane upper bound. I would cap it at 6–7; beyond that you’re just cosplaying a hippocampus.

⸻

2.2 What each layer should store

I’ll give you a tight contract per layer.

1) Session Memory (Short-term)
Purpose: Exact working set for “now”.
	•	Current task & substeps
	•	Open files, cursors, recent edits
	•	Latest conversation turns (compressed)
	•	Active ticket / branch
	•	Ephemeral scratchpad summaries (“we’re halfway through refactoring X”)

Store:
	•	Primary: in-memory object inside the Arela agent process
	•	Optional persistence: lightweight snapshot in .arela/memory/session.db (SQLite) on every significant change or IDE pause/exit

Schema (SQLite, if you persist it):

CREATE TABLE session_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  project_id TEXT,
  active_task TEXT,
  active_ticket TEXT,
  files_open TEXT,          -- JSON array
  last_edit_file TEXT,
  last_edit_line INTEGER,
  conversation_summary TEXT,
  last_updated TIMESTAMP
);

2) Project Memory (Medium-term)
Purpose: “What’s true about this repo?”
	•	Architecture decisions and rationales
	•	Patterns & conventions actually observed (not just claimed in README)
	•	Project-scoped todos / tech debt items
	•	Stable summaries of important components / slices

Store: .arela/memory/project.db (SQLite per repo)

Core tables:

CREATE TABLE project_facts (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  category TEXT,     -- 'decision', 'pattern', 'todo', 'tech_stack', 'convention'
  key TEXT,
  value_json TEXT,
  importance REAL,   -- 0..1
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_project_facts_proj_cat 
  ON project_facts(project_id, category);

3) User Memory (Long-term)
Purpose: “What’s true about this person across repos?”
	•	Tech stack preferences
	•	Workflow preferences (PR size, branching style, TDD, etc.)
	•	Expertise levels
	•	Positive patterns & anti-patterns
	•	Derived rules like “usually uses Prisma for DB”

Store: ~/.arela/user.db (global SQLite)

Core tables:

CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  key TEXT,             -- 'language', 'framework', 'db', etc.
  value TEXT,
  confidence REAL,      -- 0..1
  source TEXT,          -- 'explicit', 'inferred'
  last_seen TIMESTAMP
);

CREATE TABLE user_patterns (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  pattern_type TEXT,    -- 'pattern', 'antipattern'
  description TEXT,
  evidence_count INTEGER,
  confidence REAL,
  first_seen TIMESTAMP,
  last_seen TIMESTAMP
);

4) Vector Memory (Semantic)
Purpose: “What text/code is semantically similar to this query?”
	•	Code chunks (functions, classes, modules)
	•	Key documentation, ADRs, research notes
	•	Possibly project-level summaries

Store:
	•	FAISS index on disk for embeddings
	•	SQLite metadata (.arela/memory/vector.db) mapping chunk IDs → file, span, type

CREATE TABLE vector_chunks (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  external_id TEXT,        -- link to faiss row
  file_path TEXT,
  start_line INTEGER,
  end_line INTEGER,
  kind TEXT,               -- 'code', 'doc', 'decision'
  summary TEXT,
  last_indexed TIMESTAMP
);

CREATE INDEX idx_vector_chunks_proj 
  ON vector_chunks(project_id);

Everything embedding-heavy stays local via FAISS, matching your local-first philosophy.  ￼

5) Graph Memory (Structural)
Purpose: “How does this thing connect to everything else?”
	•	Files → files via imports
	•	Symbols → symbols via calls / references
	•	Slices / modules → constituent files

Store: .arela/memory/graph.db (SQLite; you already have this)

Minimum viable tables:

CREATE TABLE nodes (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  node_type TEXT,         -- 'file', 'symbol', 'slice'
  name TEXT,
  path TEXT,              -- for files/symbols
  metadata_json TEXT
);

CREATE TABLE edges (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  from_node INTEGER,
  to_node INTEGER,
  edge_type TEXT,         -- 'imports', 'calls', 'belongs_to'
  weight REAL,
  FOREIGN KEY(from_node) REFERENCES nodes(id),
  FOREIGN KEY(to_node) REFERENCES nodes(id)
);

CREATE INDEX idx_edges_project 
  ON edges(project_id);

This pairs nicely with the vector store; Cody’s “code graph + hybrid search” is basically this idea at scale.  ￼

6) Governance Memory (Historical)
Purpose: “What did we decide and why?”
	•	Architectural decisions
	•	Tooling choices
	•	Policy / governance rules
	•	Timestamps + authors + linked artifacts (docs, PRs)

Store: .arela/memory/audit.db (SQLite append-only)

CREATE TABLE decisions (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  title TEXT,
  description TEXT,
  rationale TEXT,
  alternatives_json TEXT,
  links_json TEXT,       -- e.g. research docs, ADR files
  created_by TEXT,
  created_at TIMESTAMP
);

This is your “event log” tier. Agent memory comparisons specifically call out event logs as a distinct, valuable memory substrate.  ￼

⸻

2.3 Retrieval strategies

Memory Router: core abstraction.

Mermaid view:

flowchart LR
  Q[User Query / Task] --> MR[Memory Router]

  MR --> S[Session]
  MR --> P[Project]
  MR --> U[User]
  MR --> V[Vector]
  MR --> G[Graph]
  MR --> A[Governance]

  S --> F[Fusion Engine]
  P --> F
  U --> F
  V --> F
  G --> F
  A --> F

  F --> T[TOON Compression]
  T --> L[LLM Call]

Algorithm (high level):
	1.	Classify query via Meta-RAG (task type: edit, explain, design, refactor, research, etc.).
	2.	Derive retrieval plan: per type, define which layers to hit and with what budget.
	3.	Parallel fetch from all relevant layers with a hard timeout per layer (say 30–50 ms).
	4.	Score & rank all candidate items.
	5.	Select context subset respecting token budget and per-layer quotas.
	6.	TOON-compress final bundle and send to LLM.

Latency: SQLite lookups + FAISS search + in-memory reads all sit comfortably under 200 ms on M1/M2 if you keep indices warm and limit results.

⸻

2.4 Fusion techniques

You’re combining heterogeneous junk into one coherent “story” for the model. Don’t be sentimental.

Scoring dimensions:
	•	Relevance: similarity to query (vector / keyword / graph distance)
	•	Recency: timestamp decay (especially for Session / Project)
	•	Authority: layer-weight (Session > Project > User > Governance > Graph > Vector)
	•	Confidence: only for learned patterns & user prefs

Score example:

score = w_rel * rel + w_rec * recency + w_auth * layer_weight + w_conf * confidence

Layer quotas for context (pre-TOON):
	•	Session: up to 40% of tokens (task + recent messages + open files snippets)
	•	Project: 20% (patterns, conventions, project-level summaries)
	•	User: 10% (prefs, patterns)
	•	Vector: 15% (top K chunks)
	•	Graph: 10% (key structural neighbourhood)
	•	Governance: 5% (only if query touches “why” / “decision”)

Semantic dedup:
	•	Compute simple hash on normalized text (e.g. minhash on sentences).
	•	Drop near-duplicates and prefer more recent / more authoritative layer.

Hierarchical retrieval:
	•	First, get summaries (e.g. project-level “auth slice summary”).
	•	Only if needed, pull in raw details (functions, config values) under that summary.

This is very aligned with current best-practice in agent memory overviews that recommend multi-stage retrieval & summarisation rather than brute force stuffing.  ￼

⸻

2.5 Consolidation & forgetting

If you don’t do this, your DBs will look like your browser tabs.

When to consolidate:
	•	Session → Project: when a task completes (ticket closed, PR merged), summarise the session into project_facts.
	•	Project → User: when a pattern is seen N times across distinct projects (e.g. ≥3 repos), increment user_patterns evidence & confidence.

Nightly job per project:
	•	Cluster vector chunks with high similarity (same file, similar content) and keep latest / clearest summary.
	•	Merge duplicate project_facts with similar key and text via similarity threshold.
	•	Drop low-importance, stale facts (importance < 0.2 and not accessed in 30 days).

Monthly job (user scope):
	•	Reduce patterns with low evidence_count and decayed confidence.
	•	Re-score patterns based on whether they’re still true in recent projects.

Decay functions:
	•	Exponential decay on recency:
decayed_weight = base_weight * exp(-λ * days_since_last_seen)
	•	Hard caps: anything not touched in 6–12 months and not high-importance can be archived or pruned.

This follows the “importance + recency” playbook many agent memory guides now push for.  ￼

⸻

3. Competitive Analysis (Memory)

Here’s the compressed gossip.

3.1 GitHub Copilot

Memory model:
	•	Context = current file + nearby code + some project awareness.  ￼
	•	Copilot Chat can use workspace context and “Spaces” to ground responses in selected content and external tools via MCP.  ￼
	•	No strong long-term user preference modelling exposed; memory is mostly implicit via context & your repo.

Gap vs Hexi-Memory:
	•	Weak session resumption, minimal explicit project & user memory, no structured governance log.

⸻

3.2 Sourcegraph Cody

Memory model:
	•	Heavy semantic indexing + code graph; embeddings over code & docs; hybrid search over text + graph.  ￼
	•	Designed for huge repos (multi-repo indexing).
	•	Has some notion of “history” in chat, but long-term user patterns are not first-class.

Gap:
	•	Strong Vector + Graph, weaker explicit Session / Project / User / Governance layers. Your Governance & User layers are a big differentiator.

⸻

3.3 Cursor

Memory model (based on public write-ups & ecosystem):
	•	Uses embeddings / RAG over codebase for context beyond file.  ￼
	•	Has features like PagedAttention for internal KV-cache efficiency (model-side context, not persistent memory).  ￼
	•	Long-term memory is mostly provided by add-ons:
	•	“ai_instructions.md” pattern for persistent project rules.  ￼
	•	Cursor Memory Bank & MCP integrations for persistent memory graphs.  ￼

Gap:
	•	Memory architecture is external & opinionated by third-party tools, not core. No universal Session/Project/User distinction.

⸻

3.4 Windsurf

Memory model:
	•	Has a headline “Memories” system that stores prompts & project info as persistent context.  ￼
	•	Claims better continuity by recalling previous tasks & projects.
	•	Backed by local server that indexes the repo (similar to Continue).  ￼

Gap:
	•	Memories are conceptually aligned with your Project/Session idea but not clearly split into structured layers or exposed as a formal API.

⸻

3.5 Replit Agent

Memory model:
	•	Agent operates over Replit’s cloud workspace, can read/write files, run commands.  ￼
	•	Community reports: no robust persistent memory; agent doesn’t remember across sessions unless you build that yourself.  ￼

Gap:
	•	Almost no structured project/user memory. Also a nice cautionary tale for “agent with too much power and not enough governance.”

⸻

3.6 Devin

Memory model (from public info & reviews):
	•	Full-stack agent running in cloud; keeps an internal workspace state while it plans, edits, tests, and opens PRs.  ￼
	•	Long-lived tasks can maintain state for hours/days, but cross-task memory & user prefs aren’t clearly exposed.

Gap:
	•	Strong “extended session” but little visibility into Project/User layers; also cloud-centric, which you explicitly avoid.

⸻

3.7 Aider

Memory model:
	•	Keeps a rolling chat history in the terminal session.  ￼
	•	Context = files you add + git history; each AI edit becomes a commit for traceability.  ￼
	•	No real long-term user or project memory; users manually summarise and /clear history for better control.

Gap:
	•	Very strong Governance analogue (git history) but no structured Project/User memory, minimal cross-session persistence.

⸻

3.8 Continue.dev / Cline / Ecosystem tools
	•	Continue: local server indexing + embeddings + rules in .continue/rules giving project-specific instructions.  ￼
	•	Cline: persistent context across environments (CLI / VS Code / CI) + Memory Bank pattern using instructions and project files.  ￼

Gap:
	•	They’ve discovered the need for memory, but again: no principled Hexi layout, mostly “rules files + embeddings + chat history.”

⸻

Conclusion of competitive sweep:
Everyone is improvising with variations of [chat history + code embeddings + occasional rules/docs]. Nobody has:
	•	A formal Hexi layout
	•	Strong User layer with preferences & patterns
	•	First-class Governance as an event log integrated into memory retrieval

That’s your angle: tasteful, structured memory vs “pile of embeddings and vibes”.

⸻

4. Implementation Plan

You want something shippable, not a research project from hell. Here’s a realistic phased plan aligned with your versioning.

Phase 1 – Session Memory (v4.1.x / early v4.2.0)

Goal: 100% session continuity across IDE restarts.

Scope:
	•	In-process session object (SessionState)
	•	Snapshot to .arela/memory/session.db on:
	•	IDE close
	•	Long inactivity
	•	Major task boundary (ticket change / branch change)
	•	On start, auto-resume last session for that project unless user explicitly starts fresh.

Session continuity flow:

sequenceDiagram
  participant IDE
  participant Arela
  participant SessDB as session.db

  IDE->>Arela: Start project
  Arela->>SessDB: Load last session for project
  SessDB-->>Arela: Session state (if any)
  Arela->>IDE: "You were working on login feature. Resume?"

  loop During coding
    IDE->>Arela: Edits / requests
    Arela->>Arela: Update in-memory SessionState
    Arela->>SessDB: Periodic snapshot
  end

  IDE->>Arela: Close project
  Arela->>SessDB: Final snapshot

Effort: ~1 dev-week to do it properly (schema, snapshots, resume logic, tests).

⸻

Phase 2 – Project Memory (v4.2.0 proper)

Goal: Make “project intelligence” real: patterns, conventions, decisions, todos.

Scope:
	•	Implement project.db schema from §2.2
	•	Event hooks:
	•	When a decision is made → write project_facts & decisions (Governance).
	•	When Arela infers pattern (e.g. repeated use of Prisma) → draft project_facts with low confidence.
	•	Add API:
	•	memory.project.rememberDecision(...)
	•	memory.project.getPatterns(...)
	•	memory.project.getTechStack(...)

Effort: ~2 dev-weeks.

⸻

Phase 3 – User Memory (v4.3.0)

Goal: Cross-project patterns & preferences that kick in after ~3 repos.

Scope:
	•	Implement user.db as in §2.2
	•	Build simple pattern mining pipeline:
	•	Scan project_facts across projects per user.
	•	If the same preference reappears (language, DB, framework), increment evidence in user_patterns & user_preferences.
	•	Integrate into prompts:
	•	“By the way, you typically use Prisma + Postgres. Want me to set that up?”

Cross-project learning diagram:

flowchart TD
  P1[Project A Facts] --> Agg[Pattern Aggregator]
  P2[Project B Facts] --> Agg
  P3[Project C Facts] --> Agg

  Agg --> UPrefs[User Preferences DB]

  UPrefs --> Suggest[On new project: suggest defaults]

Effort: ~2–3 dev-weeks including heuristics & UX prompts.

⸻

Phase 4 – Consolidation & Learning (v4.4.0)

Goal: Avoid memory bloat, add actual “learning over time.”

Scope:
	•	Nightly per-project job to:
	•	Consolidate project_facts
	•	Prune stale vector chunks
	•	Monthly user-level job:
	•	Re-score patterns & drop weak ones
	•	Introduce simple confidence & decay logic across layers.

Effort: ~2 dev-weeks.

⸻

5. Storage Technology Recommendations

Within your constraints (offline, local-first, no cloud DBs):

Session
	•	Option A (recommended):
	•	In-memory primary store
	•	Tiny SQLite snapshot per project (session.db)
	•	Option B:
	•	Add Redis if you ever move to multi-process or multi-agent setups on one machine.

SQLite gives persistence with no external service; Redis becomes interesting only when you’re doing more complex orchestration.

⸻

Project
	•	SQLite all the way.
	•	Lives inside repo (.arela/memory/project.db)
	•	Easy to backup with project, easy to diff, works offline.

Postgres / Mongo would be overkill and violate your local-first philosophy.

⸻

User
	•	Again, SQLite in ~/.arela/user.db.

Nothing else needed; you’re just storing kilobytes to a few megabytes of user patterns and prefs.

⸻

Vector

Vector is the only layer that needs something specialised.
	•	FAISS for the index, stored per project (e.g. .arela/memory/vector.index).
	•	SQLite for metadata.

Alternatives like LanceDB / Chroma are fine but pull in extra dependencies; FAISS is a tight, proven choice, especially for local-first tooling.  ￼

⸻

Graph & Governance

You already use SQLite here; that’s perfect.
	•	Graph: adjacency edges, symbol table
	•	Governance: append-only events

No need to complicate this.

⸻

6. Retrieval & Fusion Strategy (Concrete)

6.1 Parallel querying

Pseudo-API:

type MemoryLayer = 'session' | 'project' | 'user' | 'vector' | 'graph' | 'governance';

async function queryHexiMemory(query: MemoryQuery): Promise<FusedContext> {
  const plan = metaRagPlan(query); // chooses layers + budgets

  const tasks = plan.layers.map(layer =>
    withTimeout(plan.timeBudgetPerLayer, () => queryLayer(layer, query, plan))
      .catch(() => [] as MemoryItem[])
  );

  const resultsByLayer = await Promise.all(tasks);

  const flat = resultsByLayer.flat();
  const ranked = rankItems(flat, query, plan);

  const pruned = applyLayerQuotas(ranked, plan.tokenBudget);
  const fused  = fuseItems(pruned);

  return fused;
}

6.2 Ranking & scoring

Each MemoryItem has:

interface MemoryItem {
  id: string;
  layer: MemoryLayer;
  text: string;
  recency: number;       // days since
  relevance: number;     // 0..1 semantic/keyword
  confidence?: number;   // for inferred facts
  importance?: number;   // for decisions, patterns
}

Score:

function score(item: MemoryItem, weights: Weights): number {
  const recencyScore = Math.exp(-weights.lambda * item.recency);
  const layerWeight = weights.layer[item.layer] ?? 0;

  return (
    weights.relevance * item.relevance +
    weights.recency * recencyScore +
    weights.layerWeight * layerWeight +
    (item.confidence ?? 0) * weights.confidence +
    (item.importance ?? 0) * weights.importance
  );
}

6.3 Conflict resolution

If two items contradict (e.g. “prefers Prisma” vs “prefers Drizzle”):
	•	Prefer:
	•	Higher recency
	•	Higher confidence
	•	More evidence_count (for patterns)
	•	Keep both in memory but pass a single resolved statement to the model plus a note if ambiguity matters:

“User usually uses Prisma, but in this project explicitly chose Drizzle; treat this project as a Drizzle exception.”

⸻

7. Learning & Adaptation

7.1 Detecting patterns

Start simple, don’t jump into Bayesian cult worship.
	•	For each project, store tech_stack and conventions facts.
	•	Periodically aggregate across projects:

For each (key, value):
  count how many distinct projects use it.
  total_projects = N
  support = projects_with_value / N

If support ≥ threshold (e.g. 0.5) and projects_with_value ≥ 3, promote to user_preferences with confidence proportional to support.

⸻

7.2 Inferring preferences

Sources:
	•	Explicit: user config files (.arela/config.json), direct commands (“Use Postgres”).
	•	Implicit: repeated choices in new projects, repeated acceptance of certain generated patterns.

Rules of thumb:
	•	Start with low confidence (0.6) for inferred prefs.
	•	Raise confidence when:
	•	User accepts suggestions aligned with the preference.
	•	New projects adopt same stack without explicit override.
	•	Drop confidence when:
	•	User explicitly rejects or overrides.

⸻

7.3 Drift & overfitting

You want Arela to notice when “old you” isn’t “new you.”
	•	If a previously strong preference isn’t used in the last M projects, decay confidence.
	•	Mark exceptions explicitly:
	•	“In this project, the user chose Postgres instead of SQLite because of X.”

This is exactly the kind of behaviour suggested in longer-term agent memory write-ups: preference drift + context-specific overrides.  ￼

⸻

8. Privacy & Security

You’re paranoid in a good way, so keep it that way.

8.1 Never store
	•	Raw API keys, secrets, tokens, passwords, certs.
	•	Raw environment variables from .env unless explicitly whitelisted.
	•	Plain-text PII from config (emails, phone, addresses) unless user explicitly opts in.

Use crude but effective detectors:
	•	Regex patterns for keys (sk-, AKIA, JWT shapes, etc.)
	•	Known env var names (API_KEY, SECRET, PASSWORD)
	•	If in doubt: don’t store.

8.2 Encryption
	•	Encrypt user.db and project.db at rest with a key derived from OS-level secure storage (Keychain, etc.).
	•	Governance & graph can be plaintext unless user opts in to full encryption.
	•	Never log decrypted content.

⸻

8.3 User control & GDPR-ish behaviour
	•	CLI/IDE commands:
	•	arela memory list --scope user|project|session
	•	arela memory delete --id X
	•	arela memory wipe --scope user|project
	•	Export:
	•	arela memory export --scope user|project --format json

Sandboxes:
	•	Per project: keep all project memory under .arela/memory/, never share across projects except via aggregated user patterns.
	•	For work repos, allow disabling user-level learning entirely.

⸻

9. Code Examples & APIs

9.1 Session memory schema recap

Already given; plus an in-memory type:

interface SessionState {
  projectId: string;
  activeTask?: string;
  activeTicket?: string;
  filesOpen: string[];
  lastEdit?: { file: string; line: number };
  conversationSummary: string;
  lastUpdated: Date;
}

9.2 Project & user APIs

// Project
memory.project.remember({
  projectId,
  category: 'decision',
  key: 'slice_detection',
  value: {
    algorithm: 'Infomap',
    rationale: 'Better for small dense graphs',
    alternatives: ['Louvain', 'Leiden']
  },
  importance: 0.9
});

// User
memory.user.updatePreference({
  userId,
  key: 'db',
  value: 'Postgres',
  source: 'inferred',
  deltaEvidence: 1
});

9.3 Fusion pseudocode

function fuseItems(items: MemoryItem[]): FusedContext {
  const sections: Record<MemoryLayer, string[]> = {
    session: [], project: [], user: [],
    vector: [], graph: [], governance: []
  };

  const seenHashes = new Set<string>();

  for (const item of items) {
    const h = semanticHash(item.text);
    if (seenHashes.has(h)) continue;
    seenHashes.add(h);
    sections[item.layer].push(item.text);
  }

  return {
    systemContext: [
      summarizeSession(sections.session),
      summarizeProject(sections.project),
      summarizeUser(sections.user)
    ].filter(Boolean).join('\n\n'),
    evidenceBlocks: [
      ...sections.vector,
      ...sections.graph,
      ...sections.governance
    ]
  };
}

This FusedContext is what you feed into TOON.

⸻

10. Risk Assessment

Let’s be honest about where this can slap you.
	1.	Memory bloat
	•	Risk: DBs grow without bound; retrieval slows; consolidation never runs.
	•	Mitigation: quotas, nightly consolidation, size checks, archiving.
	2.	Performance degradation
	•	Risk: FAISS & SQLite queries creep above 200 ms.
	•	Mitigation: warm indices, per-layer timeouts, tune embedding dims, cache hot queries.
	3.	Privacy violations
	•	Risk: secrets/PII accidentally stored; user can’t easily purge.
	•	Mitigation: aggressive secret detection, scoped opt-in, simple memory wipe commands, encryption at rest.
	4.	Wrong or stale patterns
	•	Risk: Arela keeps insisting on Prisma in a project where you now want Drizzle.
	•	Mitigation: high weight on recency, explicit “this project is an exception” markers, visible controls (“Stop suggesting Prisma”).
	5.	Over-attachment to historical decisions
	•	Risk: Governance log becomes dogma.
	•	Mitigation: mark decisions with age + context; model prompt should frame them as “prior context, not immutable law.”

⸻

11. References (Core)

A few key references behind all this, so you know I didn’t just freestyle:
	•	Packer et al., MemGPT: Towards LLMs as Operating Systems – multi-tier memory & paging for long-context agents.  ￼
	•	Sutter, Comparing Memory Systems for LLM Agents: Vector, Graph, and Event Logs – trade-offs between vector, graph, event logs for planning agents.  ￼
	•	Lanham, AI Agents That Remember: Building Long-Term Memory Systems – practical vector + graph + event log designs for agents.  ￼
	•	Recent blogs on codebase RAG & code graphs from Sourcegraph/Cody & LanceDB – semantic indexing + graph hybrid search for large repos.  ￼
	•	Overviews on modern agentic memory architectures discussing hierarchical retrieval, consolidation, and decay.  ￼

⸻

How this plugs into Meta-RAG & TOON

Your final stack is:

flowchart TD
  U[User / IDE] --> Q[Query]
  Q --> MR[Meta-RAG Classifier]

  MR --> HR[Hexi Memory Router]

  HR --> S[Session]
  HR --> P[Project]
  HR --> UMem[User]
  HR --> V[Vector]
  HR --> G[Graph]
  HR --> Gov[Governance]

  S --> F[Fusion + Dedup]
  P --> F
  UMem --> F
  V --> F
  G --> F
  Gov --> F

  F --> T[TOON Compressor]
  T --> L[LLM (big model)]
  L --> IDE[Edits / Replies]

	•	Meta-RAG decides which layers matter.
	•	Hexi-Memory guarantees the layers are rich, consistent, and fast.
	•	TOON makes it all fit into context without bankrupting you.

Put bluntly: everyone else is throwing half-remembered notes at their models; you’re proposing an actual nervous system.

You get this right, v5.0.0 extension is not “another AI side panel”; it’s an assistant that actually remembers how you build software.