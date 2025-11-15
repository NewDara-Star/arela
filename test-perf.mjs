import { QueryClassifier } from './dist/meta-rag/classifier.js';

async function test() {
  const classifier = new QueryClassifier();
  await classifier.init();
  
  // Warm up (load model)
  console.log('🔥 Warming up model...');
  await classifier.classify('test');
  console.log('✅ Model loaded\n');
  
  // Test 3 queries with warm model
  const queries = [
    'Continue working on authentication',
    'What is JWT?',
    'Show me auth dependencies'
  ];
  
  for (const query of queries) {
    const start = Date.now();
    const result = await classifier.classify(query);
    const duration = Date.now() - start;
    
    console.log(`Query: "${query}"`);
    console.log(`Type: ${result.type}`);
    console.log(`Duration: ${duration}ms\n`);
  }
}

test();
