import ollama from 'ollama';

const query = "Continue working on authentication";
const prompt = `Classify this query into ONE type: PROCEDURAL, FACTUAL, ARCHITECTURAL, USER, or HISTORICAL.

Types:
- PROCEDURAL: Do/create/continue task ("implement auth", "continue working")
- FACTUAL: Explain concept ("what is JWT?", "how does bcrypt work?")
- ARCHITECTURAL: Code structure ("show dependencies", "what imports X?")
- USER: Personal preferences ("my preferred framework", "my expertise")
- HISTORICAL: Past decisions ("why did we choose X?", "what decisions were made?")

Query: "${query}"

Return JSON: {"type": "TYPE", "confidence": 0.0-1.0}`;

console.log("🔬 Testing consistency with 10 runs\n");

// Warmup
console.log("🔥 Warming up model...");
await ollama.generate({
  model: "qwen2.5:3b",
  prompt: "test",
  keep_alive: -1,
});
console.log("✅ Model loaded\n");

const times = [];

for (let i = 1; i <= 10; i++) {
  const start = Date.now();
  const response = await ollama.generate({
    model: "qwen2.5:3b",
    prompt,
    format: "json",
    keep_alive: -1,
    options: {
      temperature: 0.1,
      num_predict: 50,
    },
  });
  const duration = Date.now() - start;
  times.push(duration);
  
  const parsed = JSON.parse(response.response.trim());
  console.log(`Run ${i.toString().padStart(2)}: ${duration}ms - ${parsed.type}`);
}

console.log("\n📊 Statistics:");
console.log(`  Min:    ${Math.min(...times)}ms`);
console.log(`  Max:    ${Math.max(...times)}ms`);
console.log(`  Avg:    ${Math.round(times.reduce((a, b) => a + b) / times.length)}ms`);
console.log(`  Median: ${times.sort((a, b) => a - b)[Math.floor(times.length / 2)]}ms`);
console.log(`  StdDev: ${Math.round(Math.sqrt(times.map(t => Math.pow(t - times.reduce((a, b) => a + b) / times.length, 2)).reduce((a, b) => a + b) / times.length))}ms`);
