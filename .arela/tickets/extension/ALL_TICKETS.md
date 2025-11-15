# Arela v5.0.0 - All 20 Implementation Tickets

**Created:** 2025-11-15  
**Status:** Ready for Implementation  
**Timeline:** 4-5 weeks

---

## ✅ Detailed Tickets Created (5/20)

1. **EXTENSION-001**: Monorepo Setup ✅
2. **EXTENSION-002**: Server IPC ✅
3. **EXTENSION-003**: Downloader Shim ✅
4. **EXTENSION-004**: Server Lifecycle ✅
5. **EXTENSION-005**: Svelte + WebView ✅

---

## 📋 Remaining Tickets (15/20)

### UI Tickets (3 remaining)

**EXTENSION-006: Chat UI Components** (8h)
- Build Message, Input, MessageList Svelte components
- Implement chat state management (Svelte stores)
- Add loading states, error states
- Implement auto-scroll, copy button
- Style with VS Code theme variables

**EXTENSION-007: Message Passing** (6h)
- Implement Extension ↔ WebView messaging protocol
- Handle `ask`, `response`, `error`, `cancel` message types
- Add message queue for reliability
- Implement request/response correlation
- Add message validation

**EXTENSION-008: Markdown Rendering** (4h)
- Install markdown-it + highlight.js
- Implement two-phase rendering (stream raw → finalize with highlight)
- Add syntax highlighting for code blocks
- Support inline code, links, lists
- Add copy button for code blocks

---

### AI Integration Tickets (4 tickets)

**EXTENSION-009: OpenAI Streaming** (6h)
- Integrate OpenAI SDK
- Implement streaming chat completions
- Token-by-token streaming to WebView
- Handle rate limits, errors
- Add token counting and cost tracking

**EXTENSION-010: Anthropic Streaming** (4h)
- Integrate Anthropic SDK
- Implement streaming messages
- Token-by-token streaming to WebView
- Handle rate limits, errors
- Add token counting

**EXTENSION-011: SecretStorage** (4h)
- Implement API key management with `context.secrets`
- Add settings UI for API keys
- Validate API keys on save
- Handle missing keys gracefully
- Support multiple providers (OpenAI, Anthropic, Ollama)

**EXTENSION-012: Cancellation** (4h)
- Implement AbortController for AI requests
- Add cancel button in UI
- Handle in-flight request cancellation
- Clean up resources on cancel
- Show cancellation feedback

---

### Context Tickets (4 tickets)

**EXTENSION-013: IPC to HexiMemory** (6h)
- Implement `queryMemory` IPC method in server
- Wrap HexiMemory in server package
- Handle all 6 memory layers via IPC
- Add caching for frequent queries
- Test memory query performance

**EXTENSION-014: Load Persona/Rules** (4h)
- Load `arela-cto.md` persona file
- Load `.arela/rules/*.md` files
- Include in AI prompts
- Cache loaded files
- Watch for file changes (optional)

**EXTENSION-015: ContextRouter Integration** (6h)
- Integrate ContextRouter via IPC
- Route queries to correct memory layers
- Use learned weights from FeedbackLearner
- Support multi-hop reasoning
- Add routing visualization (optional)

**EXTENSION-016: Editor Context** (4h)
- Get active editor content
- Get current selection
- Get workspace files
- Include in AI prompts
- Add context size limits (token budget)

---

### CI/CD Tickets (4 tickets)

**EXTENSION-017: GitHub Actions Matrix** (8h)
- Create workflow for matrix builds
- Build server binaries for all platforms:
  - win32-x64, win32-arm64
  - darwin-x64, darwin-arm64
  - linux-x64, linux-arm64, linux-armhf
- Generate SHA-256 checksums
- Attach binaries to GitHub Release

**EXTENSION-018: Binary Packaging** (6h)
- Configure pkg or nexe for standalone binaries
- Test binaries on all platforms
- Optimize binary size
- Add version info to binaries
- Document packaging process

**EXTENSION-019: VSIX Publishing** (4h)
- Configure vsce for publishing
- Create publisher account
- Set up marketplace listing
- Add screenshots, description
- Publish universal VSIX

**EXTENSION-020: Multi-Platform Testing** (6h)
- Test extension on Windows (x64, ARM)
- Test extension on macOS (Intel, ARM)
- Test extension on Linux (x64, ARM)
- Test downloader on all platforms
- Test server lifecycle on all platforms
- Document platform-specific issues

---

## Ticket Template (For Remaining 15)

Each ticket should include:

```markdown
# EXTENSION-XXX: [Title]

**Category:** [Foundation|UI|AI|Context|CI/CD]
**Priority:** P0|P1|P2
**Estimated Time:** Xh
**Assignee:** TBD
**Status:** 🔴 Not Started

## Context
[Why this ticket exists]

## Requirements
### Must Have
- [ ] Requirement 1
- [ ] Requirement 2

### Should Have
- [ ] Nice to have 1

### Nice to Have
- [ ] Optional 1

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Details
[Code examples, architecture notes]

## Files to Create
- path/to/file1.ts
- path/to/file2.ts

## Dependencies
- **Blocks:** EXTENSION-XXX
- **Blocked by:** EXTENSION-XXX

## Testing
### Manual Test
[Steps to manually verify]

### Unit Tests
- [ ] Test case 1
- [ ] Test case 2

## Documentation
[What docs to update]

## Notes
[Important gotchas, warnings]

## Related
[Links to architecture docs, validation docs]
```

---

## Implementation Order

### Week 1: Foundation (Proof-of-Concept)
1. EXTENSION-001: Monorepo ✅
2. EXTENSION-002: Server IPC ✅
3. EXTENSION-003: Downloader ✅
4. EXTENSION-004: Server Lifecycle ✅
5. EXTENSION-005: Svelte WebView ✅

**Goal:** Working extension that spawns server and shows WebView

---

### Week 2: UI
6. EXTENSION-006: Chat UI Components
7. EXTENSION-007: Message Passing
8. EXTENSION-008: Markdown Rendering

**Goal:** Functional chat UI with message display

---

### Week 3: AI Integration
9. EXTENSION-009: OpenAI Streaming
10. EXTENSION-010: Anthropic Streaming
11. EXTENSION-011: SecretStorage
12. EXTENSION-012: Cancellation

**Goal:** AI responses streaming to chat

---

### Week 4: Context
13. EXTENSION-013: IPC to HexiMemory
14. EXTENSION-014: Load Persona/Rules
15. EXTENSION-015: ContextRouter
16. EXTENSION-016: Editor Context

**Goal:** Full Arela intelligence in extension

---

### Week 5: CI/CD & Ship
17. EXTENSION-017: GitHub Actions
18. EXTENSION-018: Binary Packaging
19. EXTENSION-019: VSIX Publishing
20. EXTENSION-020: Multi-Platform Testing

**Goal:** Published to VS Code Marketplace! 🚀

---

## Quick Reference

**Total Tickets:** 20  
**Total Hours:** 110 hours  
**Total Days:** ~14 working days  
**Total Weeks:** 4-5 weeks (with buffer)

**Created:** 5 detailed tickets  
**Remaining:** 15 tickets (outlined above)

**Next Action:** Create remaining 15 detailed tickets, or start implementation with existing 5 tickets for proof-of-concept.

---

## Notes

- First 5 tickets are fully detailed and ready to implement
- Remaining 15 tickets are outlined with clear requirements
- Can create detailed tickets as needed (just-in-time)
- Or create all 20 detailed tickets upfront (your choice)

**Recommendation:** Start with proof-of-concept (tickets 1-5), then create detailed tickets for week 2 as you go.

---

**Ready to build! 🚀**
