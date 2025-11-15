import ollama from 'ollama';

const LONG_PROMPT = `You are an expert query classifier for the Arela Meta-RAG system. Your task is to classify a user's query into one of five distinct types.

You MUST return a single, valid JSON object with the schema:
{"type": "TYPE", "confidence": 0.0-1.0, "reasoning": "Your step-by-step analysis."}

Think step-by-step to determine the correct type:
1. Analyze the user's query.
2. Compare its intent and keywords against the definitions below.
3. Pay close attention to the contrastive examples to resolve ambiguity.
4. Provide your step-by-step analysis in the "reasoning" field.
5. Select the single best "type" and provide a "confidence" score.

---

1. **PROCEDURAL**:
   * Intent: The user wants to DO, CREATE, or CONTINUE an action or task.
   * Keywords: "implement", "continue", "add", "create", "build", "make", "refactor".
   * Example Query: "Continue working on the authentication"
   * Example JSON: {"type": "PROCEDURAL", "confidence": 0.9, "reasoning": "The query uses the keyword 'Continue', indicating a task-oriented action. This is a PROCEDURAL request."}

2. **FACTUAL**:
   * Intent: The user is seeking general KNOWLEDGE or an EXPLANATION of a concept.
   * Keywords: "what is", "how does", "explain", "describe", "what's the".
   * Contrast: This is for *concepts* ("What is JWT?"), not *code structure* ("What imports auth.ts?").
   * Example Query: "How does bcrypt work?"
   * Example JSON: {"type": "FACTUAL", "confidence": 1.0, "reasoning": "The query uses 'How does...work', seeking an explanation of a concept. This is a standard FACTUAL request."}

3. **ARCHITECTURAL**:
   * Intent: The user is asking about the CODE STRUCTURE, dependencies, or file relationships.
   * Keywords: "show dependencies", "imports", "structure", "calls", "uses", "diagram", "file structure".
   * Contrast: This is for *code structure* ("What imports auth.ts?"), not *concepts* ("What is auth?").
   * Example Query: "What imports the auth module?"
   * Example JSON: {"type": "ARCHITECTURAL", "confidence": 0.9, "reasoning": "The query uses the keyword 'imports' and asks about a specific code module ('auth module'), indicating a request about code structure. This is ARCHITECTURAL."}

4. **USER**:
   * Intent: The user is asking about their *own* preferences, expertise, or habits.
   * Keywords: "my preferred", "my expertise", "what do I like", "my setup".
   * Contrast: This is *personal* to the user ("What's my preferred framework?"), not *general* ("What is a framework?").
   * Example Query: "What is my preferred testing framework?"
   * Example JSON: {"type": "USER", "confidence": 1.0, "reasoning": "The query uses the phrase 'my preferred', indicating a request for personal user data. This is a USER request."}

5. **HISTORICAL**:
   * Intent: The user is asking about *past* decisions, rationale, or project history.
   * Keywords: "what decisions were made", "why did we", "history", "rationale", "when did we".
   * Contrast: This is about *past rationale* ("Why did we choose Postgres?"), not *current state* ("What database are we using?").
   * Example Query: "Why did we choose PostgreSQL?"
   * Example JSON: {"type": "HISTORICAL", "confidence": 0.9, "reasoning": "The query uses 'Why did we choose', asking for the rationale behind a past decision. This is a HISTORICAL request."}

---

Query: "QUERY_HERE"

Think step-by-step and return ONLY the JSON:`;

const SHORT_PROMPT = `Classify this query into ONE type: PROCEDURAL, FACTUAL, ARCHITECTURAL, USER, or HISTORICAL.

Types:
- PROCEDURAL: Do/create/continue task ("implement auth", "continue working")
- FACTUAL: Explain concept ("what is JWT?", "how does bcrypt work?")
- ARCHITECTURAL: Code structure ("show dependencies", "what imports X?")
- USER: Personal preferences ("my preferred framework", "my expertise")
- HISTORICAL: Past decisions ("why did we choose X?", "what decisions were made?")

Query: "QUERY_HERE"

Return JSON: {"type": "TYPE", "confidence": 0.0-1.0}`;

const queries = [
  "Continue working on authentication",
  "What is JWT?",
  "Show me auth dependencies"
];

console.log("🔥 Testing LONG vs SHORT prompts with qwen2.5:3b\n");

for (const query of queries) {
  console.log(`\n📝 Query: "${query}"`);
  
  // Test LONG prompt
  const longStart = Date.now();
  const longResponse = await ollama.generate({
    model: "qwen2.5:3b",
    prompt: LONG_PROMPT.replace("QUERY_HERE", query),
    format: "json",
    keep_alive: -1,
    options: { temperature: 0.1, num_predict: 150 }
  });
  const longDuration = Date.now() - longStart;
  
  // Test SHORT prompt
  const shortStart = Date.now();
  const shortResponse = await ollama.generate({
    model: "qwen2.5:3b",
    prompt: SHORT_PROMPT.replace("QUERY_HERE", query),
    format: "json",
    keep_alive: -1,
    options: { temperature: 0.1, num_predict: 50 }
  });
  const shortDuration = Date.now() - shortStart;
  
  console.log(`  LONG:  ${longDuration}ms - ${longResponse.response.trim().substring(0, 80)}...`);
  console.log(`  SHORT: ${shortDuration}ms - ${shortResponse.response.trim().substring(0, 80)}...`);
  console.log(`  ⚡ Speedup: ${((longDuration - shortDuration) / longDuration * 100).toFixed(1)}%`);
}
