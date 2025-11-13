import { loadGraph } from './src/detect/graph-loader.js';

const dbPath = '/Users/Star/stride-api/.arela/memory/graph.db';
console.log('Loading graph from:', dbPath);

try {
  const graph = loadGraph(dbPath);
  console.log('Graph loaded successfully!');
  console.log('Nodes:', graph.nodes.length);
  console.log('Edges:', graph.edges.length);
} catch (error) {
  console.error('Error loading graph:', error);
}
