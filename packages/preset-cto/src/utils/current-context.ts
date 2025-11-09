/**
 * Get current date/time context for AI research and searches
 * This ensures we always search for current information, not outdated data
 */

export interface CurrentContext {
  year: number;
  month: number;
  day: number;
  quarter: string;
  yearMonth: string;
  fullDate: string;
  searchSuffix: string;
}

/**
 * Get current date context
 */
export function getCurrentContext(): CurrentContext {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed
  const day = now.getDate();
  
  // Calculate quarter
  const quarter = `Q${Math.ceil(month / 3)}`;
  
  // Format year-month
  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
  
  // Full date
  const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Search suffix for web searches
  const searchSuffix = `${year} ${quarter} latest`;
  
  return {
    year,
    month,
    day,
    quarter,
    yearMonth,
    fullDate,
    searchSuffix,
  };
}

/**
 * Build a search query with current context
 */
export function buildSearchQuery(baseQuery: string, options?: {
  includeYear?: boolean;
  includeQuarter?: boolean;
  includeLatest?: boolean;
}): string {
  const ctx = getCurrentContext();
  const parts = [baseQuery];
  
  const {
    includeYear = true,
    includeQuarter = false,
    includeLatest = true,
  } = options || {};
  
  if (includeYear) {
    parts.push(ctx.year.toString());
  }
  
  if (includeQuarter) {
    parts.push(ctx.quarter);
  }
  
  if (includeLatest) {
    parts.push('latest');
  }
  
  return parts.join(' ');
}

/**
 * Check if data is stale (older than N months)
 */
export function isDataStale(dataDate: string, maxAgeMonths = 3): boolean {
  const now = new Date();
  const data = new Date(dataDate);
  const diffMonths = (now.getTime() - data.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  return diffMonths > maxAgeMonths;
}

/**
 * Get a warning message if using potentially outdated information
 */
export function getStaleDataWarning(lastUpdated?: string): string | null {
  if (!lastUpdated) {
    return null;
  }
  
  const ctx = getCurrentContext();
  
  if (isDataStale(lastUpdated, 6)) {
    return `⚠️  This data was last updated on ${lastUpdated}. Current date is ${ctx.fullDate}. Information may be outdated.`;
  }
  
  return null;
}

/**
 * Format current context for display
 */
export function formatCurrentContext(): string {
  const ctx = getCurrentContext();
  return `Current: ${ctx.fullDate} (${ctx.year} ${ctx.quarter})`;
}

/**
 * Get search context message for logging
 */
export function getSearchContextMessage(): string {
  const ctx = getCurrentContext();
  return `Searching with context: ${ctx.year} ${ctx.quarter} (${ctx.fullDate})`;
}
