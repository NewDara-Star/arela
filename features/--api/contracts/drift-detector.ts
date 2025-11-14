/**
 * Detect schema drift between frontend calls and backend endpoints
 */
import {
  ApiCall,
  ApiEndpoint,
  DriftIssue,
  EndpointMatch,
  DriftSeverity,
  DriftType,
} from './types';

/**
 * Main drift detection function
 */
export function detectDrift(
  matches: EndpointMatch[],
  unmatchedCalls: ApiCall[],
  unmatchedEndpoints: ApiEndpoint[]
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  // Check for mismatches in matched pairs
  for (const match of matches) {
    for (const call of match.calls) {
      const driftInPair = detectPairDrift(call, match.endpoint);
      issues.push(...driftInPair);
    }
  }

  // Add issues for unmatched calls
  for (const call of unmatchedCalls) {
    issues.push({
      type: 'endpoint-not-found',
      severity: 'critical',
      call,
      message: `Frontend calls ${call.method} ${call.url} but endpoint not found in backend`,
      suggestion: `Check if endpoint exists or if path differs from frontend call`,
    });
  }

  // Add issues for unmatched endpoints
  for (const endpoint of unmatchedEndpoints) {
    // Only report if it's an API endpoint (not deprecated or internal)
    if (!endpoint.path.includes('_internal') && !endpoint.path.includes('deprecated')) {
      issues.push({
        type: 'endpoint-not-found',
        severity: 'high',
        endpoint,
        message: `Backend defines ${endpoint.method} ${endpoint.path} but no frontend calls found`,
        suggestion: `Endpoint may be unused or frontend may be using different path`,
      });
    }
  }

  return issues;
}

/**
 * Detect drift between a specific call and endpoint pair
 */
function detectPairDrift(call: ApiCall, endpoint: ApiEndpoint): DriftIssue[] {
  const issues: DriftIssue[] = [];

  // Check method mismatch
  if (call.method !== endpoint.method) {
    issues.push({
      type: 'method-mismatch',
      severity: 'critical',
      call,
      endpoint,
      message: `Method mismatch: frontend calls ${call.method} but backend defines ${endpoint.method}`,
      suggestion: `Update either frontend call or backend endpoint to use ${endpoint.method}`,
    });
  }

  // Check path mismatch (exact vs fuzzy match)
  const pathDrift = detectPathDrift(call.url, endpoint.path);
  if (pathDrift) {
    issues.push(pathDrift);
  }

  return issues;
}

/**
 * Detect path drift between call URL and endpoint path
 */
function detectPathDrift(callUrl: string, endpointPath: string): DriftIssue | null {
  // Normalize both for comparison
  const normalizedCall = normalizeForComparison(callUrl);
  const normalizedEndpoint = normalizeForComparison(endpointPath);

  // Exact match is good
  if (normalizedCall === normalizedEndpoint) {
    return null;
  }

  // Check for common naming issues
  const singular = singularize(endpointPath);
  const plural = pluralize(endpointPath);
  const callNormalized = normalizeForComparison(callUrl);

  // Check singular/plural mismatch
  if (normalizeForComparison(plural) === callNormalized) {
    return {
      type: 'path-mismatch',
      severity: 'high',
      message: `Path mismatch: frontend calls ${callUrl} but backend defines ${endpointPath} (singular/plural)`,
      suggestion: `Standardize endpoint naming to use plural form consistently`,
    };
  }

  if (normalizeForComparison(singular) === callNormalized) {
    return {
      type: 'path-mismatch',
      severity: 'high',
      message: `Path mismatch: frontend calls ${callUrl} but backend defines ${endpointPath} (singular/plural)`,
      suggestion: `Standardize endpoint naming to use singular form consistently`,
    };
  }

  // Check camelCase vs snake_case
  const callCamelCase = toCamelCase(callUrl);
  const endpointCamelCase = toCamelCase(endpointPath);

  if (callCamelCase === endpointCamelCase) {
    return {
      type: 'path-mismatch',
      severity: 'medium',
      message: `Path case mismatch: frontend calls ${callUrl} but backend defines ${endpointPath}`,
      suggestion: `Standardize naming convention: use snake_case or camelCase consistently`,
    };
  }

  // Generic path mismatch
  return {
    type: 'path-mismatch',
    severity: 'medium',
    message: `Path mismatch: frontend calls ${callUrl} but backend defines ${endpointPath}`,
    suggestion: `Verify endpoint path is correct on both frontend and backend`,
  };
}

/**
 * Normalize path for comparison
 */
function normalizeForComparison(path: string): string {
  return path
    .toLowerCase()
    .replace(/[{}$]/g, '') // Remove template literal markers
    .replace(/\//g, '-') // Convert to dash-separated
    .replace(/[_-]+/g, '-'); // Normalize separators
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .split(/[-_/]/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Simple pluralization
 */
function pluralize(word: string): string {
  const lastWord = word.split('/').pop() || word;

  if (!lastWord) return word;

  // Check common patterns
  if (lastWord.endsWith('y')) {
    return word.replace(/y$/, 'ies');
  }
  if (lastWord.endsWith('s') || lastWord.endsWith('x') || lastWord.endsWith('z')) {
    return word + 'es';
  }

  return word + 's';
}

/**
 * Simple singularization
 */
function singularize(word: string): string {
  const lastWord = word.split('/').pop() || word;

  if (!lastWord) return word;

  // Check common patterns
  if (lastWord.endsWith('ies')) {
    return word.replace(/ies$/, 'y');
  }
  if (lastWord.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (lastWord.endsWith('s')) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Get severity counts
 */
export function getDriftSummary(issues: DriftIssue[]) {
  return {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };
}
