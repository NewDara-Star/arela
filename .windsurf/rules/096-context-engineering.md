---
trigger: always_on
---

- Maintain local index of repo; agents must read .arela/** at session start.
- Define architectural invariants; test them.
- On context drift, run Context Integrity Check (what/why/fix) and halt.