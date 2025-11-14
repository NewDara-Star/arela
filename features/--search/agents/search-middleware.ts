/**
 * Search Middleware - ENFORCES arela_search before grep
 * 
 * This wraps agent execution and intercepts search calls.
 * If agent tries to use grep without arela_search first,
 * we BLOCK it and force them to use arela_search.
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

interface SearchAttempt {
  type: 'arela_search' | 'grep' | 'find';
  query: string;
  timestamp: number;
  allowed: boolean;
  blockedReason?: string;
}

export class SearchMiddleware {
  private searchHistory: SearchAttempt[] = [];
  private cwd: string;
  
  constructor(cwd: string) {
    this.cwd = cwd;
  }
  
  /**
   * Check if RAG index exists and is recent
   */
  async hasValidRagIndex(): Promise<boolean> {
    const ragIndexPath = path.join(this.cwd, '.arela', '.rag-index.json');
    
    if (!await fs.pathExists(ragIndexPath)) {
      return false;
    }
    
    const stats = await fs.stat(ragIndexPath);
    const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    
    // Consider stale if older than 24 hours
    return ageInHours < 24;
  }
  
  /**
   * Check if MCP server is running
   */
  async isMcpServerRunning(): Promise<boolean> {
    try {
      // Check if arela mcp process is running
      const result = await execa('pgrep', ['-f', 'arela mcp']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if agent tried arela_search in last 2 minutes
   */
  hasTriedArelaSearch(): boolean {
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
    
    return this.searchHistory.some(
      s => s.type === 'arela_search' && 
           s.timestamp > twoMinutesAgo &&
           s.allowed
    );
  }
  
  /**
   * Intercept and validate a search attempt
   */
  async validateSearch(type: 'grep' | 'find' | 'arela_search', query: string): Promise<{
    allowed: boolean;
    message?: string;
    suggestion?: string;
  }> {
    // Always allow arela_search
    if (type === 'arela_search') {
      this.recordSearch(type, query, true);
      return { allowed: true };
    }
    
    // For grep/find, check if they tried arela_search first
    if (!this.hasTriedArelaSearch()) {
      const hasRagIndex = await this.hasValidRagIndex();
      const hasMcpServer = await this.isMcpServerRunning();
      
      let message = `
🚨 BLOCKED: You must try arela_search before using ${type}!

Why this matters:
- arela_search: ~1k tokens ($0.01)
- ${type}: ~85k tokens ($0.85)
- You're wasting 85x more tokens!

`;
      
      if (!hasRagIndex) {
        message += `
⚠️  RAG index is missing or stale!
Run: arela index

`;
      }
      
      if (!hasMcpServer) {
        message += `
⚠️  MCP server is not running!
Run: arela mcp (in background)

`;
      }
      
      message += `
Try this instead:
  arela_search "${query}"

If arela_search doesn't find what you need, THEN you can use ${type}.
`;
      
      this.recordSearch(type, query, false, message);
      
      return {
        allowed: false,
        message,
        suggestion: `arela_search "${query}"`
      };
    }
    
    // They tried arela_search, allow grep/find
    this.recordSearch(type, query, true);
    return { allowed: true };
  }
  
  /**
   * Record a search attempt
   */
  private recordSearch(
    type: SearchAttempt['type'],
    query: string,
    allowed: boolean,
    blockedReason?: string
  ) {
    this.searchHistory.push({
      type,
      query,
      timestamp: Date.now(),
      allowed,
      blockedReason
    });
    
    // Keep only last 20 searches
    if (this.searchHistory.length > 20) {
      this.searchHistory.shift();
    }
  }
  
  /**
   * Get search statistics
   */
  getStats() {
    const total = this.searchHistory.length;
    const arelaSearches = this.searchHistory.filter(s => s.type === 'arela_search').length;
    const grepSearches = this.searchHistory.filter(s => s.type === 'grep' || s.type === 'find').length;
    const blocked = this.searchHistory.filter(s => !s.allowed).length;
    
    const tokensSaved = blocked * 84000; // 85k - 1k = 84k saved per blocked grep
    const moneySaved = (tokensSaved / 1000) * 0.01; // Rough estimate
    
    return {
      total,
      arelaSearches,
      grepSearches,
      blocked,
      tokensSaved,
      moneySaved: moneySaved.toFixed(2),
      arelaSearchPercentage: total > 0 ? ((arelaSearches / total) * 100).toFixed(1) : '0'
    };
  }
  
  /**
   * Print search statistics
   */
  printStats() {
    const stats = this.getStats();
    
    console.log(`
📊 Search Statistics:
   Total searches: ${stats.total}
   arela_search: ${stats.arelaSearches} (${stats.arelaSearchPercentage}%)
   grep/find: ${stats.grepSearches}
   Blocked: ${stats.blocked}
   
💰 Savings:
   Tokens saved: ${stats.tokensSaved.toLocaleString()}
   Money saved: $${stats.moneySaved}
`);
  }
}

/**
 * Wrap agent execution with search enforcement
 */
export async function executeWithSearchEnforcement(
  cwd: string,
  agentCommand: string,
  prompt: string
): Promise<{ success: boolean; output: string; stats: any }> {
  const middleware = new SearchMiddleware(cwd);
  
  // TODO: Actually intercept tool calls here
  // This would require hooking into the agent's tool execution
  // For now, this is a framework for future implementation
  
  // Execute agent
  const result = await execa('sh', ['-c', agentCommand], {
    cwd,
    input: prompt,
    timeout: 30 * 60 * 1000
  });
  
  const stats = middleware.getStats();
  middleware.printStats();
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stats
  };
}
