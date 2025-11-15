import ollama from 'ollama';

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

const models = ["llama3.2:3b", "qwen2.5:3b"];

console.log("🔥 Testing SHORT prompt across models\n");

for (const model of models) {
  console.log(`\n🤖 Model: ${model}`);
  
  for (const query of queries) {
    const start = Date.now();
    const response = await ollama.generate({
      model,
      prompt: SHORT_PROMPT.replace("QUERY_HERE", query),
      format: "json",
      keep_alive: -1,
      options: { temperature: 0.1, num_predict: 50 }
    });
    const duration = Date.now() - start;
    
    const parsed = JSON.parse(response.response.trim());
    console.log(`  ${duration}ms - ${parsed.type} (${parsed.confidence})`);
  }
}
