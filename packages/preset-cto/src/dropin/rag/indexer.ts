import pc from "picocolors";
import { getDb, closeDb, upsertDoc, upsertVec, getAllDocs, getStats } from "./db.js";
import { chunkRepo } from "./chunker.js";
import { embed } from "./embed.js";

export async function indexRepo(opts: { cwd: string; clean?: boolean }): Promise<void> {
  console.log(pc.cyan("Building semantic index...\n"));
  
  const db = getDb(opts.cwd);
  
  try {
    if (opts.clean) {
      console.log(pc.yellow("Cleaning existing index..."));
      db.exec("DELETE FROM docs");
      db.exec("DELETE FROM vecs");
    }
    
    // Chunk all files
    console.log(pc.dim("Chunking repository..."));
    const chunks = await chunkRepo(opts.cwd);
    console.log(pc.dim(`Found ${chunks.length} chunks\n`));
    
    // Get existing docs to check what needs updating
    const existing = new Set(getAllDocs(db).map(d => d.id));
    const newChunks = chunks.filter(c => !existing.has(c.id));
    
    if (newChunks.length === 0 && !opts.clean) {
      console.log(pc.green("✓ Index up to date"));
      const stats = getStats(db);
      console.log(pc.dim(`  Docs: ${stats.totalDocs}`));
      console.log(pc.dim(`  Vectors: ${stats.totalVecs}`));
      return;
    }
    
    console.log(pc.dim(`Indexing ${newChunks.length} new/changed chunks...`));
    
    // Insert docs
    for (const chunk of newChunks) {
      upsertDoc(db, chunk);
    }
    
    // Embed in batches
    const BATCH_SIZE = 10;
    let processed = 0;
    
    for (let i = 0; i < newChunks.length; i += BATCH_SIZE) {
      const batch = newChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.text);
      
      try {
        const embeddings = await embed(texts);
        
        for (let j = 0; j < batch.length; j++) {
          upsertVec(db, batch[j].id, embeddings[j]);
        }
        
        processed += batch.length;
        process.stdout.write(`\r${pc.dim(`  Progress: ${processed}/${newChunks.length}`)}`);
      } catch (error) {
        console.log(pc.yellow(`\n  Warning: Embedding batch failed: ${(error as Error).message}`));
      }
    }
    
    console.log(); // New line after progress
    
    const stats = getStats(db);
    console.log(pc.green(`\n✓ Index built`));
    console.log(pc.dim(`  Total docs: ${stats.totalDocs}`));
    console.log(pc.dim(`  Total vectors: ${stats.totalVecs}`));
    console.log(pc.dim(`  By kind: ${JSON.stringify(stats.byKind)}`));
    console.log(pc.dim(`\n  Saved to .arela/rag.db`));
  } finally {
    closeDb();
  }
}
