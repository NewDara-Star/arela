# Research-Driven Decision Making

**Description:** Triggers deep research when encountering suboptimal implementations or major technical decisions. Generates structured research prompts for ChatGPT + Gemini to provide evidence-based recommendations.

## When to Trigger

Use this workflow when:
- Current implementation seems suboptimal for our use case
- Choosing between multiple algorithms or approaches
- Encountering a known limitation (e.g., resolution limit, performance issues)
- Considering a major architectural change
- Evaluating new technologies or patterns
- Debugging a conceptual/algorithmic issue

**Don't trigger for:**
- Simple bug fixes
- Obvious implementation errors
- Standard patterns with clear best practices
- Minor refactoring

## Workflow Steps

### 1. Identify the Decision Point

First, clearly state:
- What is the current problem or limitation?
- Why is the current approach suboptimal?
- What alternatives exist?

### 2. Generate Research Prompt

Create a structured research prompt with these sections:

```markdown
# Research Request: [Topic]

## Context
[Brief description of the problem/decision - 2-3 sentences]

## Our Specific Use Case
[Details about our requirements, constraints, scale]
- Scale: [e.g., 10-50 files, small graphs]
- Requirements: [e.g., must detect 4-6 feature slices]
- Constraints: [e.g., directed edges, dense subgraphs]
- Current behavior: [what's happening now]
- Expected behavior: [what should happen]

## Research Questions
1. [Primary question - e.g., "Is Infomap optimal for this use case?"]
2. [Comparison question - e.g., "How does it compare to Leiden?"]
3. [Edge cases - e.g., "How to handle singletons, hubs, circular deps?"]
4. [Implementation - e.g., "What are the hyperparameters?"]

## What We Need
- Validation or disproval of approach X
- Comparison of X vs Y vs Z (with benchmarks if available)
- Best practices for [specific scenario]
- Known limitations and workarounds
- Implementation guidance (algorithms, libraries, code examples)

## Success Criteria
[What makes a solution "good" for our use case]
- Performance: [e.g., < 5 seconds for 1000 files]
- Accuracy: [e.g., 90%+ correct grouping]
- Maintainability: [e.g., simple to understand and extend]
```

### 3. Present to User

Say to the user:

```
🔬 RESEARCH NEEDED

I've identified a decision point that would benefit from deep research.

[Paste the research prompt above]

Please:
1. Copy this prompt
2. Paste into ChatGPT + Gemini
3. Save results to RESEARCH/[topic-name].md
4. Share findings with me

I'll wait for your research before proceeding.
```

### 4. Wait for Research Results

Do NOT proceed with implementation until user provides research findings.

### 5. Review Research Together

Once user shares research:
1. Read the research file
2. Summarize key findings
3. Discuss trade-offs
4. Make informed recommendation
5. Document decision rationale

### 6. Implement Based on Research

After decision is made:
1. Implement the chosen approach
2. Reference research in code comments
3. Update relevant documentation
4. Create ADR if it's a major decision

### 7. Document in Memory

Create a memory capturing:
- The problem
- Research findings
- Decision made
- Rationale
- Implementation notes

## Example: CASCADE-003 (Louvain → Infomap)

**Problem:** Louvain algorithm returning 13 singletons instead of 5 slices

**Research Prompt Generated:**
```markdown
# Research Request: Optimal Community Detection for Codebase Vertical Slice Detection

## Context
Louvain clustering fails on small, dense codebase graphs (10-50 nodes)

## Our Use Case
- Small graphs (10-50 files)
- Dense subgraphs (feature directories)
- Directed edges (imports)
- Expected output: 4-6 feature slices

## Research Questions
1. Is Infomap optimal for this use case?
2. How does it compare to Leiden?
3. How to handle edge cases (singletons, hubs, circular deps)?
4. What are the hyperparameters?

## What We Need
- Academic evidence for/against Infomap
- Comparative benchmarks
- Practical implementation guidance
- Edge case handling strategies
```

**Result:** Comprehensive research led to successful Infomap implementation

## Benefits

✅ **Evidence-based decisions** - Not guessing or using outdated knowledge  
✅ **Parallel research** - ChatGPT + Gemini provide multiple perspectives  
✅ **Documented rationale** - Research files serve as ADRs  
✅ **Continuous learning** - Build knowledge base over time  
✅ **Reduced risk** - Avoid costly wrong decisions  

## Integration with Arela Rules

This workflow aligns with:
- **Two-Way Door Decisions** - Research helps identify Type 1 vs Type 2
- **Technical Debt Management** - Prevents inadvertent reckless debt
- **ADR Discipline** - Research becomes the ADR foundation
- **Pragmatic Visionary** - Build for users, validate with research

## Anti-Patterns to Avoid

❌ **Don't research:**
- Every minor decision (paralysis by analysis)
- Well-established patterns (use industry standards)
- Obvious bugs (just fix them)

✅ **Do research:**
- Novel problems
- Multiple viable approaches
- Performance-critical decisions
- Architectural foundations
