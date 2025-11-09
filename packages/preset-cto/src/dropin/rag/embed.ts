/**
 * Embedding functions for semantic search
 * 
 * Priority:
 * 1. Ollama (if available)
 * 2. Simple hash-based fallback (for MVP)
 * 
 * Future: Add @xenova/transformers for local e5-small
 */

import crypto from "crypto";

export async function embed(texts: string[]): Promise<Float32Array[]> {
  // Try Ollama first
  try {
    return await embedWithOllama(texts);
  } catch (error) {
    // Fallback to simple hash-based embedding (MVP)
    return embedWithHash(texts);
  }
}

async function embedWithOllama(texts: string[]): Promise<Float32Array[]> {
  // Check if Ollama is available
  try {
    const response = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nomic-embed-text",
        prompt: texts[0], // Ollama API takes one at a time
      }),
    });
    
    if (!response.ok) {
      throw new Error("Ollama not available");
    }
    
    const data = await response.json();
    
    // Process all texts
    const embeddings: Float32Array[] = [];
    for (const text of texts) {
      const res = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: text,
        }),
      });
      
      const d = await res.json();
      embeddings.push(Float32Array.from(d.embedding));
    }
    
    return embeddings;
  } catch (error) {
    throw new Error("Ollama embedding failed");
  }
}

/**
 * Simple hash-based embedding fallback
 * Not semantically meaningful, but allows MVP functionality
 * 
 * Creates a 384-dimensional vector from text hashes
 */
function embedWithHash(texts: string[]): Float32Array[] {
  const DIM = 384; // Match e5-small dimensions
  
  return texts.map((text) => {
    const vec = new Float32Array(DIM);
    
    // Create multiple hashes to fill dimensions
    for (let i = 0; i < DIM; i += 32) {
      const hash = crypto
        .createHash("sha256")
        .update(text + i.toString())
        .digest();
      
      // Convert hash bytes to floats
      for (let j = 0; j < Math.min(32, DIM - i); j++) {
        vec[i + j] = (hash[j] / 255) * 2 - 1; // Normalize to [-1, 1]
      }
    }
    
    // Normalize vector
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < DIM; i++) {
        vec[i] /= norm;
      }
    }
    
    return vec;
  });
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
