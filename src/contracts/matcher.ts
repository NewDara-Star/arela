/**
 * Match API calls to endpoints
 */
import { ApiCall, ApiEndpoint, EndpointMatch } from './types';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) {
    return 1.0;
  }

  return 1.0 - distance / maxLength;
}

/**
 * Normalize a path by replacing parameter values with placeholders
 */
function normalizePath(path: string): string {
  // Replace :id, :uuid, :param with consistent placeholder
  return path
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, ':param')
    .toLowerCase();
}

/**
 * Match calls to endpoints using fuzzy matching
 */
export function matchCallsToEndpoints(
  calls: ApiCall[],
  endpoints: ApiEndpoint[],
  threshold: number = 0.75
): EndpointMatch[] {
  const matches: EndpointMatch[] = [];
  const matchedCallIds = new Set<number>();

  for (const endpoint of endpoints) {
    const candidateCalls = calls.filter(
      c =>
        c.method === endpoint.method &&
        !matchedCallIds.has(c.id)
    );

    if (candidateCalls.length === 0) {
      continue;
    }

    // Normalize endpoint path
    const normalizedEndpointPath = normalizePath(endpoint.path);

    // Find all calls that match this endpoint
    const matchingCalls: ApiCall[] = [];

    for (const call of candidateCalls) {
      const normalizedCallPath = normalizePath(call.url);
      const similarity = calculateSimilarity(normalizedCallPath, normalizedEndpointPath);

      if (similarity >= threshold) {
        matchingCalls.push(call);
        matchedCallIds.add(call.id);
      }
    }

    if (matchingCalls.length > 0) {
      // Calculate average similarity for all matching calls
      const similarities = matchingCalls.map(c => {
        const normalizedCallPath = normalizePath(c.url);
        return calculateSimilarity(normalizedCallPath, normalizedEndpointPath);
      });
      const avgSimilarity =
        similarities.reduce((a, b) => a + b, 0) / similarities.length;

      matches.push({
        endpoint,
        calls: matchingCalls,
        similarity: avgSimilarity,
      });
    }
  }

  return matches;
}

/**
 * Find unmatched calls (frontend calls with no matching endpoint)
 */
export function findUnmatchedCalls(
  calls: ApiCall[],
  matches: EndpointMatch[]
): ApiCall[] {
  const matchedCallIds = new Set<number>();

  for (const match of matches) {
    for (const call of match.calls) {
      matchedCallIds.add(call.id);
    }
  }

  return calls.filter(c => !matchedCallIds.has(c.id));
}

/**
 * Find unmatched endpoints (backend endpoints with no frontend calls)
 */
export function findUnmatchedEndpoints(
  endpoints: ApiEndpoint[],
  matches: EndpointMatch[]
): ApiEndpoint[] {
  const matchedEndpointIds = new Set<number>();

  for (const match of matches) {
    matchedEndpointIds.add(match.endpoint.id);
  }

  return endpoints.filter(e => !matchedEndpointIds.has(e.id));
}

/**
 * Get matching statistics
 */
export function getMatchingStats(
  calls: ApiCall[],
  endpoints: ApiEndpoint[],
  matches: EndpointMatch[]
) {
  const unmatchedCalls = findUnmatchedCalls(calls, matches);
  const unmatchedEndpoints = findUnmatchedEndpoints(endpoints, matches);

  return {
    totalCalls: calls.length,
    totalEndpoints: endpoints.length,
    matchedCount: matches.length,
    unmatchedCallsCount: unmatchedCalls.length,
    unmatchedEndpointsCount: unmatchedEndpoints.length,
    matchPercentage: endpoints.length > 0
      ? (matches.length / endpoints.length) * 100
      : 0,
    avgSimilarity: matches.length > 0
      ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
      : 0,
  };
}
