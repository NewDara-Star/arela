/**
 * Group endpoints and calls by slice
 */
import { ApiEndpoint, ApiCall, EndpointMatch, SliceGroup, DriftIssue } from './types';

/**
 * Group endpoints by slice
 */
export function groupEndpointsBySlice(
  endpoints: ApiEndpoint[]
): Map<string, ApiEndpoint[]> {
  const groups = new Map<string, ApiEndpoint[]>();

  for (const endpoint of endpoints) {
    const slice = extractSlice(endpoint.path);

    if (!groups.has(slice)) {
      groups.set(slice, []);
    }

    groups.get(slice)!.push(endpoint);
  }

  return groups;
}

/**
 * Group calls by slice
 */
export function groupCallsBySlice(
  calls: ApiCall[]
): Map<string, ApiCall[]> {
  const groups = new Map<string, ApiCall[]>();

  for (const call of calls) {
    const slice = extractSlice(call.url);

    if (!groups.has(slice)) {
      groups.set(slice, []);
    }

    groups.get(slice)!.push(call);
  }

  return groups;
}

/**
 * Group matches by slice
 */
export function groupMatchesBySlice(
  matches: EndpointMatch[]
): Map<string, EndpointMatch[]> {
  const groups = new Map<string, EndpointMatch[]>();

  for (const match of matches) {
    const slice = extractSlice(match.endpoint.path);

    if (!groups.has(slice)) {
      groups.set(slice, []);
    }

    groups.get(slice)!.push(match);
  }

  return groups;
}

/**
 * Group drift issues by slice
 */
export function groupDriftBySlice(
  drift: DriftIssue[]
): Map<string, DriftIssue[]> {
  const groups = new Map<string, DriftIssue[]>();

  for (const issue of drift) {
    // Try to get slice from either endpoint or call
    let slice = 'unknown';

    if (issue.endpoint) {
      slice = extractSlice(issue.endpoint.path);
    } else if (issue.call) {
      slice = extractSlice(issue.call.url);
    }

    if (!groups.has(slice)) {
      groups.set(slice, []);
    }

    groups.get(slice)!.push(issue);
  }

  return groups;
}

/**
 * Create slice groups with all related data
 */
export function createSliceGroups(
  endpointsBySlice: Map<string, ApiEndpoint[]>,
  callsBySlice: Map<string, ApiCall[]>,
  matchesBySlice: Map<string, EndpointMatch[]>,
  driftBySlice: Map<string, DriftIssue[]>
): SliceGroup[] {
  const sliceNames = new Set<string>();

  // Collect all unique slice names
  for (const name of endpointsBySlice.keys()) {
    sliceNames.add(name);
  }
  for (const name of callsBySlice.keys()) {
    sliceNames.add(name);
  }
  for (const name of matchesBySlice.keys()) {
    sliceNames.add(name);
  }
  for (const name of driftBySlice.keys()) {
    sliceNames.add(name);
  }

  // Create group for each slice
  const groups: SliceGroup[] = [];

  for (const name of Array.from(sliceNames).sort()) {
    groups.push({
      name,
      endpoints: endpointsBySlice.get(name) || [],
      calls: callsBySlice.get(name) || [],
      matches: matchesBySlice.get(name) || [],
      drift: driftBySlice.get(name) || [],
    });
  }

  return groups;
}

/**
 * Extract slice name from API path/URL
 * Examples:
 *   /api/users/123 → users
 *   /api/workouts/456 → workouts
 *   /api/nutrition/meals → nutrition
 */
export function extractSlice(path: string): string {
  // Remove leading /api/ if present
  let relative = path;
  if (relative.startsWith('/api/')) {
    relative = relative.substring(5);
  }

  // Get first path component
  const parts = relative.split('/').filter(p => p && !p.startsWith(':'));

  if (parts.length === 0) {
    return 'unknown';
  }

  // Return first part (the slice name)
  // Singularize it for consistency
  const slice = parts[0];
  return singularize(slice);
}

/**
 * Singularize a word (simple implementation)
 */
function singularize(word: string): string {
  // Remove common plural endings
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Get slice statistics
 */
export function getSliceStats(
  groups: SliceGroup[]
): {
  totalSlices: number;
  sliceDetails: Array<{
    name: string;
    endpointCount: number;
    callCount: number;
    matchCount: number;
    driftCount: number;
  }>;
} {
  return {
    totalSlices: groups.length,
    sliceDetails: groups.map(group => ({
      name: group.name,
      endpointCount: group.endpoints.length,
      callCount: group.calls.length,
      matchCount: group.matches.length,
      driftCount: group.drift.length,
    })),
  };
}
