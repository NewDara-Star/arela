/**
 * Search Enforcer - Reminds agents to use arela_search first
 * 
 * This could be integrated into the orchestration system to
 * intercept grep/find calls and suggest arela_search instead.
 */

export interface SearchCall {
  type: 'grep' | 'find' | 'arela_search';
  query: string;
  timestamp: number;
}

export class SearchEnforcer {
  private searchHistory: SearchCall[] = [];
  
  /**
   * Check if agent tried arela_search before grep
   */
  shouldAllowGrep(query: string): { allowed: boolean; message?: string } {
    const recentSearches = this.searchHistory.filter(
      s => Date.now() - s.timestamp < 60000 // Last minute
    );
    
    const triedArelaSearch = recentSearches.some(s => s.type === 'arela_search');
    
    if (!triedArelaSearch) {
      return {
        allowed: false,
        message: `
🚨 STOP! You're about to use grep without trying arela_search first.

Try this instead:
  arela_search "${query}"

This will:
- Save 85k+ tokens
- Find relevant code semantically
- Be faster and more accurate

Only use grep if arela_search fails to find what you need.
        `.trim()
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Record a search call
   */
  recordSearch(type: SearchCall['type'], query: string) {
    this.searchHistory.push({
      type,
      query,
      timestamp: Date.now()
    });
    
    // Keep only last 10 searches
    if (this.searchHistory.length > 10) {
      this.searchHistory.shift();
    }
  }
  
  /**
   * Get search statistics
   */
  getStats() {
    const total = this.searchHistory.length;
    const arelaSearches = this.searchHistory.filter(s => s.type === 'arela_search').length;
    const grepSearches = this.searchHistory.filter(s => s.type === 'grep').length;
    
    return {
      total,
      arelaSearches,
      grepSearches,
      arelaSearchPercentage: total > 0 ? (arelaSearches / total) * 100 : 0
    };
  }
}

// Singleton instance
export const searchEnforcer = new SearchEnforcer();
