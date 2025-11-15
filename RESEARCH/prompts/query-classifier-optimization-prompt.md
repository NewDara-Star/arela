# Research Request: Optimal Model & Prompt for Query Classification

## Context

We're building a **query classifier** for Arela's Meta-RAG system that routes user queries to the right memory layer. We've tested 4 models and found **llama3.1:8b** is best so far, but it's **too slow (3.8s)** and **not accurate enough (54%)**.

## Current Implementation

### Model: llama3.1:8b (Meta's Llama 3.1 8B)
- **Performance:** 3.8s per classification
- **Accuracy:** 54% (14/26 tests passing)
- **Size:** 8B parameters (4.9GB)
- **Cost:** FREE (local via Ollama)

### Task: Classify queries into 5 types
1. **PROCEDURAL** - "Continue working on auth", "Implement login"
2. **FACTUAL** - "What is JWT?", "How does bcrypt work?"
3. **ARCHITECTURAL** - "Show me auth dependencies", "What imports login.ts?"
4. **USER** - "What's my preferred testing framework?", "My expertise in frontend"
5. **HISTORICAL** - "What decisions were made?", "Why did we choose Postgres?"

### Current Prompt (Simplified)
```
You are a query classifier. Classify this query into one of these types:
- PROCEDURAL: Action-oriented (implement, continue, add)
- FACTUAL: Knowledge-seeking (what is, how does, explain)
- ARCHITECTURAL: Structure-focused (show dependencies, imports)
- USER: Personal preferences (my preferred, my expertise)
- HISTORICAL: Past decisions (what decisions, why did we)

Query: "{query}"

Return JSON: {"type": "...", "confidence": 0.0-1.0, "reasoning": "..."}
```

### Problems
1. **Too slow:** 3.8s vs target <1s
2. **Over-classifies as "factual":** When uncertain, defaults to factual
3. **Confuses similar types:**
   - "What imports auth?" → factual (should be architectural)
   - "What's my preferred framework?" → factual (should be user)
   - "What decisions were made?" → factual (should be historical)

## Models Already Tested

| Model | Size | Speed | Accuracy | Verdict |
|-------|------|-------|----------|---------|
| qwen2.5-coder:1.5b | 1.5B | N/A | N/A | ❌ Wrong tool (coding model) |
| tinyllama:1.1b | 1.1B | ~1s | 0% | ❌ Too dumb (everything → general) |
| gemma3:4b | 4B | 5s | 46% | ⚠️ Too slow |
| llama3.1:8b | 8B | 3.8s | 54% | ✅ Current best |

## Research Questions

### 1. Model Selection
**Question:** What's the optimal model for fast, accurate query classification?

**Requirements:**
- **Speed:** <1s per classification (ideally <200ms per our Meta-RAG research)
- **Accuracy:** >85% on our 5-type classification
- **Size:** 1-3B parameters (per our Meta-RAG research recommendation)
- **Availability:** Available via Ollama or easy to run locally
- **Cost:** FREE (no API costs)

**From Our Previous Meta-RAG Research:**
Our research specifically recommended **1-3B parameter models** for classification:
- `llama3.2:1b` or `llama3.2:3b` - Meta's latest small models
- `qwen-2.5:3b` - Alibaba's efficient model
- `deepseek-r1:1.5b` - Specialized for search tasks
- `llama2-3b` - Proven for classification

**Why we haven't tested these yet:**
We jumped straight to llama3.1:8b (too big, too slow). We should test the 1-3B models first as recommended.

**Additional candidates to consider:**
- Phi-3-mini (3.8B) - Microsoft's efficient model
- Mistral-7B-Instruct - Known for instruction following (but might be too big)

**What we need:**
- Benchmarks on classification tasks
- Speed comparisons (tokens/sec)
- Instruction-following quality
- Which models are best for semantic understanding vs code generation

### 2. Prompt Engineering
**Question:** How do we improve classification accuracy with better prompts?

**Current issues:**
- Model defaults to "factual" when uncertain
- Doesn't distinguish architectural from factual
- Doesn't recognize user preference queries
- Doesn't identify historical/temporal queries

**Techniques to research:**
1. **Few-shot learning** - Add 2-3 examples per type
2. **Chain-of-thought** - Ask model to reason step-by-step
3. **Negative examples** - Show what's NOT each type
4. **Keyword hints** - Provide signal words for each type
5. **Confidence calibration** - Better confidence scoring

**Example improved prompt structure:**
```
You are a query classifier for a code memory system.

PROCEDURAL queries are about DOING something:
- Examples: "Continue working on auth", "Implement login feature"
- Keywords: continue, implement, add, create, build
- NOT factual questions (those ask WHAT/HOW, not DO)

FACTUAL queries ask WHAT or HOW something works:
- Examples: "What is JWT?", "How does bcrypt work?"
- Keywords: what is, how does, explain, describe
- NOT about code structure (those are architectural)

ARCHITECTURAL queries ask about CODE STRUCTURE:
- Examples: "Show me auth dependencies", "What imports login.ts?"
- Keywords: dependencies, imports, structure, calls, uses
- NOT about concepts (those are factual)

[etc for USER and HISTORICAL]

Query: "{query}"

Think step-by-step:
1. What is the user asking for?
2. Which type best matches?
3. What keywords indicate this type?

Return JSON: {"type": "...", "confidence": 0.0-1.0, "reasoning": "..."}
```

### 3. Alternative Approaches
**Question:** Are there better ways to classify queries than using an LLM?

**Options to research:**
1. **Hybrid approach** - Heuristics + LLM
   - Use regex/keywords for obvious cases (fast)
   - Use LLM only for ambiguous queries (accurate)
   
2. **Fine-tuned classifier** - Train small model on our data
   - Collect 1000+ labeled queries
   - Fine-tune tiny model (distilbert, etc.)
   - Super fast (<100ms), high accuracy
   
3. **Ensemble** - Multiple strategies vote
   - Keyword matching (fast, 70% accuracy)
   - Small LLM (medium, 80% accuracy)
   - Large LLM (slow, 90% accuracy)
   - Combine with confidence weighting
   
4. **Embedding similarity** - Compare to example embeddings
   - Pre-compute embeddings for example queries
   - New query → embedding → find nearest neighbor
   - Very fast (<50ms), decent accuracy

### 4. Performance Optimization
**Question:** How do we make classification faster?

**Techniques to research:**
1. **Model quantization** - Use Q4/Q8 quantized models
2. **Prompt compression** - Shorter prompts = faster inference
3. **Caching** - Cache common query patterns
4. **Batching** - Classify multiple queries at once
5. **Async execution** - Don't block on classification
6. **Warm model** - Keep model loaded in memory
7. **Structured output** - Use JSON mode for faster parsing

## Success Criteria

A solution is successful if it achieves:
1. ✅ **Speed:** <1s per classification (ideally <500ms)
2. ✅ **Accuracy:** >85% on our test suite
3. ✅ **Cost:** $0 (no API costs)
4. ✅ **Reliability:** Consistent results (not flaky)
5. ✅ **Maintainability:** Easy to improve over time

## What We Need From Research

### Primary Deliverables
1. **Model recommendation** - Which model(s) to use and why
2. **Prompt template** - Improved prompt with examples
3. **Optimization strategy** - How to achieve <1s latency
4. **Accuracy improvement plan** - How to reach >85%

### Secondary Deliverables
1. **Benchmarks** - Speed/accuracy comparisons
2. **Alternative approaches** - Hybrid, fine-tuned, ensemble
3. **Implementation guidance** - Code examples, best practices
4. **Fallback strategy** - What to do when classification fails

## Our Use Case Details

### Environment
- **Platform:** macOS (Apple Silicon M1/M2)
- **Runtime:** Ollama (local model server)
- **Language:** TypeScript/Node.js
- **Context:** Part of larger Meta-RAG system

### Query Volume
- **Frequency:** ~100 queries/day per user
- **Latency budget:** <1s (ideally <500ms)
- **Accuracy requirement:** >85% (critical for routing)

### Memory Layers (What We Route To)
1. **Session** - Current task, open files
2. **Project** - Architecture, decisions, patterns
3. **User** - Preferences, expertise, habits
4. **Vector** - Semantic code search
5. **Graph** - Structural dependencies
6. **Governance** - Historical decisions, audit trail

### Example Queries (From Test Suite)
```typescript
// PROCEDURAL (should route to Session + Project + Vector)
"Continue working on authentication"
"Implement login feature"
"Add tests for auth"

// FACTUAL (should route to Vector + Graph)
"What is the authentication flow?"
"How does JWT work?"
"Explain the login process"

// ARCHITECTURAL (should route to Project + Graph + Governance)
"Show me auth dependencies"
"What imports the auth module?"
"Show me the file structure"

// USER (should route to User only)
"What is my preferred testing framework?"
"My expertise in frontend"
"What do I like to use?"

// HISTORICAL (should route to Project + Governance)
"What decisions were made about auth?"
"Why did we choose PostgreSQL?"
"Show me change history"
```

## Constraints

### Must-Haves
- ✅ Runs locally (no cloud APIs)
- ✅ FREE (no costs)
- ✅ Works with Ollama
- ✅ <4B parameters (laptop-friendly)
- ✅ TypeScript integration

### Nice-to-Haves
- Quantized models (Q4/Q8)
- Structured output (JSON mode)
- Batch processing
- Fine-tuning capability

## Expected Output Format

Please provide:

### 1. Model Recommendation
```markdown
## Recommended Model: [Model Name]

**Why:** [Reasoning]
**Speed:** [Expected tokens/sec]
**Accuracy:** [Expected % on our task]
**Size:** [Parameters, disk space]
**How to get:** [Ollama command]

**Alternatives:**
1. [Model 2] - [Why/when to use]
2. [Model 3] - [Why/when to use]
```

### 2. Improved Prompt
```markdown
## Optimized Prompt Template

[Full prompt with examples, reasoning, etc.]

**Why this works:** [Explanation]
**Expected improvement:** [Accuracy gain]
```

### 3. Implementation Strategy
```markdown
## Implementation Plan

**Phase 1: Quick Wins (1 day)**
- [Action 1]
- [Action 2]

**Phase 2: Optimization (3 days)**
- [Action 1]
- [Action 2]

**Phase 3: Advanced (1 week)**
- [Action 1]
- [Action 2]
```

### 4. Benchmarks & Evidence
```markdown
## Performance Benchmarks

| Model | Speed | Accuracy | Memory | Verdict |
|-------|-------|----------|--------|---------|
| [Model 1] | [ms] | [%] | [GB] | [✅/❌] |

**Sources:** [Links to benchmarks, papers, etc.]
```

## Timeline

**Urgency:** HIGH
- Current: 54% accuracy, 3.8s latency (not production-ready)
- Target: >85% accuracy, <1s latency
- Deadline: v4.2.0 (2-3 weeks)

## Thank You!

This research will directly impact Arela's ability to intelligently route queries to the right memory layer. The better the classification, the better the context, the better the AI responses.

**We're building the "context router" that makes AI coding assistants 10x better.** 🚀
