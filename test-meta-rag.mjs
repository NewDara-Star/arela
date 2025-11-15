#!/usr/bin/env node
/**
 * Quick test script for Meta-RAG end-to-end flow
 * Run: node test-meta-rag.mjs
 */

import { config } from 'dotenv';
import { ContextRouter } from './dist/context-router.js';

// Load .env file
config();

const queries = [
  "Continue working on authentication",
  "What is JWT?",
  "Show me auth dependencies",
  "What's my preferred testing framework?",
  "Why did we choose Postgres?"
];

console.log('🧪 Testing Meta-RAG Context Router\n');

const router = new ContextRouter();
await router.init();

for (const query of queries) {
  console.log(`\n📝 Query: "${query}"`);
  
  const start = Date.now();
  const response = await router.route({ query });
  const duration = Date.now() - start;
  
  console.log(`  📊 Classification: ${response.classification.type} (${response.classification.confidence})`);
  console.log(`  🎯 Layers: ${response.routing.layers.join(', ')}`);
  console.log(`  💡 Reasoning: ${response.routing.reasoning}`);
  console.log(`  ⏱️  Stats:`);
  console.log(`     Classification: ${response.stats.classificationTime}ms`);
  console.log(`     Retrieval: ${response.stats.retrievalTime}ms`);
  console.log(`     Total: ${response.stats.totalTime}ms`);
  console.log(`     Estimated tokens: ${response.stats.tokensEstimated}`);
}

console.log('\n✅ All tests complete!');
