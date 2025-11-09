import pc from "picocolors";
import { getDb, closeDb, type DocChunk } from "./db.js";
import { embed, cosineSimilarity } from "./embed.js";

export interface SearchResult {
  chunk: DocChunk;
  score: number;
}

export async function semanticSearch(
  cwd: string,
  query: string,
  k: number = 10
): Promise<SearchResult[]> {
  const db = getDb(cwd);
  
  try {
    // Embed query
    const [queryVec] = await embed([query]);
    
    // Get all docs and vectors
    const docs = db.prepare(`SELECT * FROM docs`).all() as DocChunk[];
    const vecs = db.prepare(`SELECT * FROM vecs`).all() as Array<{ id: string; embedding: Buffer }>;
    
    if (docs.length === 0) {
      console.log(pc.yellow("No documents in index. Run 'arela index' first."));
      return [];
    }
    
    // Build vector map
    const vecMap = new Map<string, Float32Array>();
    for (const vec of vecs) {
      vecMap.set(vec.id, new Float32Array(vec.embedding.buffer));
    }
    
    // Calculate similarities
    const results: SearchResult[] = [];
    
    for (const doc of docs) {
      const docVec = vecMap.get(doc.id);
      if (!docVec) continue;
      
      const score = cosineSimilarity(queryVec, docVec);
      results.push({ chunk: doc, score });
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Return top k
    return results.slice(0, k);
  } finally {
    closeDb();
  }
}

export async function printSearchResults(
  cwd: string,
  query: string,
  k: number = 10
): Promise<void> {
  console.log(pc.cyan(`Searching for: "${query}"\n`));
  
  const results = await semanticSearch(cwd, query, k);
  
  if (results.length === 0) {
    console.log(pc.yellow("No results found"));
    return;
  }
  
  console.log(pc.bold(`Found ${results.length} results:\n`));
  
  for (let i = 0; i < results.length; i++) {
    const { chunk, score } = results[i];
    
    console.log(pc.bold(`${i + 1}. ${chunk.path}:${chunk.chunk}`));
    console.log(pc.dim(`   Score: ${score.toFixed(3)} | Kind: ${chunk.kind} | Lang: ${chunk.lang || "n/a"}`));
    
    // Show preview (first 150 chars)
    const preview = chunk.text.slice(0, 150).replace(/\n/g, " ");
    console.log(pc.dim(`   ${preview}${chunk.text.length > 150 ? "..." : ""}`));
    console.log();
  }
}
