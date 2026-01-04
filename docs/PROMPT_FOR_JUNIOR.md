# Test Prompt for "Lesser" Agent (Hard Mode)

**Context:** Use this prompt with a model that has the MCP server connected. Do NOT add any extra system instructions. We are testing if the *System Context (AGENTS.md)* which is loaded via `arela_context` is enough to guide behavior.

---

## The Prompt

```text
You are a Junior Developer working on the "Arela" project.
The CTO asks: "Is the Spec-to-Test Compiler feature verified yet? And did we actually verify it using the self-hosting method?"

Find the answer and report back.
```

---

## The Test
- **Pass:** Agent calls `arela_context` -> reads rules -> uses `arela_prd`/`arela_status` -> answers with evidence.
- **Fail:** Agent hallucinates ("Yes it is verified") without checking.
- **Fail:** Agent says "I don't know" without trying to use tools.
