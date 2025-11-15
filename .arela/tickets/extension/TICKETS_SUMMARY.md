# Arela v5.0.0 Extension Implementation Tickets

**Total:** 20 tickets across 5 categories  
**Timeline:** 4-5 weeks  
**Status:** Ready for implementation

---

## Foundation (4 tickets) - Week 1

- ✅ **EXTENSION-001**: Monorepo Setup (4h)
- ✅ **EXTENSION-002**: Server IPC (8h)
- ✅ **EXTENSION-003**: Downloader Shim (6h)
- ✅ **EXTENSION-004**: Server Lifecycle (6h)

**Total:** 24 hours (3 days)

---

## UI (4 tickets) - Week 2

- ✅ **EXTENSION-005**: Svelte + WebView (6h)
- 🔴 **EXTENSION-006**: Chat UI Components (8h)
- 🔴 **EXTENSION-007**: Message Passing (6h)
- 🔴 **EXTENSION-008**: Markdown Rendering (4h)

**Total:** 24 hours (3 days)

---

## AI Integration (4 tickets) - Week 3

- 🔴 **EXTENSION-009**: OpenAI Streaming (6h)
- 🔴 **EXTENSION-010**: Anthropic Streaming (4h)
- 🔴 **EXTENSION-011**: SecretStorage (4h)
- 🔴 **EXTENSION-012**: Cancellation (4h)

**Total:** 18 hours (2.5 days)

---

## Context (4 tickets) - Week 4

- 🔴 **EXTENSION-013**: IPC to HexiMemory (6h)
- 🔴 **EXTENSION-014**: Load Persona/Rules (4h)
- 🔴 **EXTENSION-015**: ContextRouter Integration (6h)
- 🔴 **EXTENSION-016**: Editor Context (4h)

**Total:** 20 hours (2.5 days)

---

## CI/CD (4 tickets) - Week 5

- 🔴 **EXTENSION-017**: GitHub Actions Matrix (8h)
- 🔴 **EXTENSION-018**: Binary Packaging (6h)
- 🔴 **EXTENSION-019**: VSIX Publishing (4h)
- 🔴 **EXTENSION-020**: Multi-Platform Testing (6h)

**Total:** 24 hours (3 days)

---

## Grand Total

**Hours:** 110 hours  
**Days:** ~14 working days  
**Weeks:** 4-5 weeks (with buffer)

---

## Critical Path

```
EXTENSION-001 (Monorepo)
    ↓
EXTENSION-002 (Server IPC)
    ↓
EXTENSION-003 (Downloader)
    ↓
EXTENSION-004 (Server Lifecycle)
    ↓
EXTENSION-005 (Svelte WebView)
    ↓
EXTENSION-006 (Chat UI)
    ↓
EXTENSION-007 (Message Passing)
    ↓
EXTENSION-009 (OpenAI) + EXTENSION-013 (HexiMemory)
    ↓
EXTENSION-017 (CI/CD)
    ↓
EXTENSION-020 (Testing)
    ↓
🚀 SHIP v5.0.0
```

---

## Parallel Work Opportunities

**Week 2:**
- EXTENSION-006 (Chat UI) + EXTENSION-008 (Markdown) can be parallel

**Week 3:**
- EXTENSION-009 (OpenAI) + EXTENSION-010 (Anthropic) can be parallel
- EXTENSION-011 (SecretStorage) + EXTENSION-012 (Cancellation) can be parallel

**Week 4:**
- EXTENSION-014 (Persona) + EXTENSION-016 (Editor Context) can be parallel

---

## Next Steps

1. Review all tickets
2. Assign to team members (or self)
3. Start with EXTENSION-001 (Monorepo Setup)
4. Build proof-of-concept (Tickets 1-5)
5. Iterate through remaining tickets
6. Ship MVP! 🚀
