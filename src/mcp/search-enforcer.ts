/**
 * Search Enforcer - BLOCKS grep/find unless arela_search was tried first
 * 
 * This is the 100% solution to force agents to use semantic search.
 */

interface ToolCall {
  tool: string;
  timestamp: number;
  args: any;
}

export class SearchEnforcer {
  private toolCallHistory: ToolCall[] = [];
  private tokensSaved: number = 0;
  private grepBlocked: number = 0;
  
  /**
   * Record a tool call
   */
  recordToolCall(tool: string, args: any) {
    this.toolCallHistory.push({
      tool,
      timestamp: Date.now(),
      args
    });
    
    // Keep only last 50 calls
    if (this.toolCallHistory.length > 50) {
      this.toolCallHistory.shift();
    }
  }
  
  /**
   * Check if arela_search was tried in last 2 minutes
   */
  hasTriedArelaSearch(): boolean {
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
    
    return this.toolCallHistory.some(
      call => call.tool === 'arela_search' && call.timestamp > twoMinutesAgo
    );
  }
  
  /**
   * Validate if grep/find is allowed
   */
  validateGrepAttempt(query: string): { allowed: boolean; message?: string } {
    if (this.hasTriedArelaSearch()) {
      // They tried arela_search, allow grep
      return { allowed: true };
    }
    
    // Block grep and provide helpful message
    this.grepBlocked++;
    this.tokensSaved += 84000; // 85k - 1k = 84k saved
    
    const message = `
🚨 BLOCKED: You must try arela_search before using grep!

Why this matters:
  arela_search: ~1,000 tokens ($0.01)
  grep:        ~85,000 tokens ($0.85)
  
You're about to waste 85x more tokens!

Try this instead:
  arela_search "${query}"

If arela_search doesn't find what you need, THEN you can use grep.

💰 Stats:
  Grep calls blocked: ${this.grepBlocked}
  Tokens saved: ${this.tokensSaved.toLocaleString()}
  Money saved: $${(this.tokensSaved / 1000 * 0.01).toFixed(2)}
`;
    
    return {
      allowed: false,
      message: message.trim()
    };
  }
  
  /**
   * Get enforcement statistics
   */
  getStats() {
    const total = this.toolCallHistory.length;
    const arelaSearches = this.toolCallHistory.filter(c => c.tool === 'arela_search').length;
    const grepAttempts = this.toolCallHistory.filter(c => c.tool === 'grep_search').length;
    
    return {
      totalCalls: total,
      arelaSearches,
      grepAttempts,
      grepBlocked: this.grepBlocked,
      tokensSaved: this.tokensSaved,
      moneySaved: (this.tokensSaved / 1000 * 0.01).toFixed(2),
      complianceRate: total > 0 ? ((arelaSearches / total) * 100).toFixed(1) : '0'
    };
  }
  
  /**
   * Print statistics
   */
  printStats() {
    const stats = this.getStats();
    
    console.log(`
📊 Search Enforcement Stats:
   Total tool calls: ${stats.totalCalls}
   arela_search: ${stats.arelaSearches}
   grep attempts: ${stats.grepAttempts}
   grep blocked: ${stats.grepBlocked}
   
💰 Savings:
   Tokens saved: ${stats.tokensSaved.toLocaleString()}
   Money saved: $${stats.moneySaved}
   
✅ Compliance rate: ${stats.complianceRate}%
`);
  }
}

// Singleton instance
export const searchEnforcer = new SearchEnforcer();
