---
id: arela.context_integrity
title: Context Integrity Protocol
version: 1.0.0
priority: highest
tags: [process, quality]
---
At session start:
1) Re-read the latest project state note.
2) Ingest new inputs from THIS turn first.
3) Sanity-check the next action matches the last approved ticket or milestone.
If inconsistent: stop, state the inconsistency, and request correction before proceeding.
