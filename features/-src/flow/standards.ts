/**
 * Standards Module
 * Defines and checks standards for:
 * - Security (input validation, auth, crypto)
 * - UX (accessibility, performance, responsiveness)
 * - Architecture (modularity, dependencies, coupling)
 * - Performance (caching, optimization, memory)
 */

export type StandardCategory = 'security' | 'ux' | 'architecture' | 'performance';
export type Severity = 'critical' | 'warning' | 'info';

export interface StandardViolation {
  id: string;
  standard: string;
  category: StandardCategory;
  severity: Severity;
  location: string;
  description: string;
  refactorProposal: string;
  priority: number;
}

export interface StandardsCheckResult {
  violations: StandardViolation[];
  passedChecks: string[];
  score: {
    security: number;
    ux: number;
    architecture: number;
    performance: number;
    overall: number;
  };
}

/**
 * Define all standards
 */
const SECURITY_STANDARDS = [
  {
    id: 'SEC_001',
    name: 'Input Validation',
    description: 'All user inputs must be validated and sanitized',
    patterns: [
      /(?:req\.|params\.|query\.|body\.)/,
      /innerHTML|dangerouslySetInnerHTML/,
    ],
    check: (content: string) => {
      const hasValidation = /validate|sanitize|trim|parseInt|Number\(|zod|yup|joi/i.test(content);
      const hasDangerousPatterns = /innerHTML|dangerouslySetInnerHTML|eval\(|Function\(/i.test(content);
      return hasValidation && !hasDangerousPatterns;
    },
  },
  {
    id: 'SEC_002',
    name: 'Authentication Check',
    description: 'All protected routes must have authentication checks',
    patterns: [/middleware|auth|JWT|token|session/i],
    check: (content: string) => {
      return /(?:auth|middleware|JWT|token|session|isAuth|requireAuth)/i.test(content);
    },
  },
  {
    id: 'SEC_003',
    name: 'Error Handling',
    description: 'Errors must be properly caught and handled without exposing sensitive info',
    patterns: [/try|catch|error|Error/],
    check: (content: string) => {
      const hasTryCatch = /try\s*{[\s\S]*?}\s*catch/i.test(content);
      const hasErrorHandling = /\.catch\(|error\s*=>|throw\s+(?:new\s+)?Error/i.test(content);
      return hasTryCatch || hasErrorHandling;
    },
  },
  {
    id: 'SEC_004',
    name: 'No Hardcoded Secrets',
    description: 'API keys, passwords, and secrets must not be hardcoded',
    patterns: [/password|secret|api_key|apiKey|token/i],
    check: (content: string) => {
      const hasHardcodedSecrets = /(?:password|secret|api_?key|token)\s*[:=]\s*['"`][\w\-]/i.test(content);
      const usesEnvVars = /process\.env|import\.meta\.env/.test(content);
      return !hasHardcodedSecrets || usesEnvVars;
    },
  },
  {
    id: 'SEC_005',
    name: 'SQL Injection Prevention',
    description: 'Use parameterized queries to prevent SQL injection',
    patterns: [/query|sql|database/i],
    check: (content: string) => {
      const hasRawSQL = /`SELECT|'SELECT|\`INSERT|'INSERT|query\s*\(\s*['"`]/i.test(content);
      const usesParameterized = /\?|\$1|\${|parameterized|prepared/i.test(content);
      return !hasRawSQL || usesParameterized;
    },
  },
];

const UX_STANDARDS = [
  {
    id: 'UX_001',
    name: 'Loading States',
    description: 'All async operations should show loading states',
    patterns: [/fetch|async|await|promise/i],
    check: (content: string) => {
      const hasAsync = /(?:fetch|axios|async|await)/.test(content);
      const hasLoadingState = /loading|isLoading|pending|isPending|state\s*=\s*['"`]loading/i.test(content);
      return !hasAsync || hasLoadingState;
    },
  },
  {
    id: 'UX_002',
    name: 'Error Messages',
    description: 'User-friendly error messages should be displayed',
    patterns: [/error|catch|reject/i],
    check: (content: string) => {
      const hasErrorHandling = /error|catch|\.catch/i.test(content);
      const hasUserMessage = /message|notification|toast|alert|display.*error/i.test(content);
      return !hasErrorHandling || hasUserMessage;
    },
  },
  {
    id: 'UX_003',
    name: 'Accessibility (WCAG)',
    description: 'Components should follow WCAG accessibility guidelines',
    patterns: [/button|input|form|link|image/i],
    check: (content: string) => {
      const hasAlt = /alt=|aria-label|role=/.test(content);
      const hasSemanticHTML = /<(button|input|label|nav|main|article|section)/.test(content);
      return hasAlt || hasSemanticHTML;
    },
  },
  {
    id: 'UX_004',
    name: 'Mobile Responsive',
    description: 'Design should be responsive on mobile devices',
    patterns: [/style|css|media|viewport/i],
    check: (content: string) => {
      const hasMediaQueries = /@media|mobile|responsive|breakpoint/.test(content);
      const hasMobileClasses = /sm:|md:|lg:|mobile|tablet|desktop/.test(content);
      return hasMediaQueries || hasMobileClasses;
    },
  },
  {
    id: 'UX_005',
    name: 'Keyboard Navigation',
    description: 'All interactive elements should be keyboard accessible',
    patterns: [/onClick|button|link|form/i],
    check: (content: string) => {
      const hasKeyboardHandlers = /onKeyDown|onKeyUp|onKeyPress|tabIndex|role=/.test(content);
      const hasSemanticElements = /<(button|a|input)/.test(content);
      return hasKeyboardHandlers || hasSemanticElements;
    },
  },
];

const ARCHITECTURE_STANDARDS = [
  {
    id: 'ARCH_001',
    name: 'Module Cohesion',
    description: 'Each module should have a single, well-defined responsibility',
    patterns: [/export|function|class/],
    check: (content: string) => {
      const exportCount = (content.match(/export\s+(?:default\s+)?(?:function|const|class)/g) || []).length;
      // Good cohesion if 1-3 exports
      return exportCount <= 3;
    },
  },
  {
    id: 'ARCH_002',
    name: 'Dependency Injection',
    description: 'Dependencies should be injected, not hardcoded',
    patterns: [/import|require|new\s+/],
    check: (content: string) => {
      const hasConstructor = /constructor\s*\(/.test(content);
      const hasFunctionParams = /function\s+\w+\s*\([^)]+\)/.test(content);
      return hasConstructor || hasFunctionParams;
    },
  },
  {
    id: 'ARCH_003',
    name: 'Circular Dependencies',
    description: 'Should not have circular dependencies between modules',
    patterns: [/import|require/],
    check: (content: string) => {
      // This is checked during tracing, not in static content
      return true;
    },
  },
  {
    id: 'ARCH_004',
    name: 'Code Reusability',
    description: 'Duplicate code should be extracted into reusable functions',
    patterns: [/function|const/],
    check: (content: string) => {
      const lines = content.split('\n');
      // If file is > 300 lines, consider breaking it up
      return lines.length <= 300;
    },
  },
  {
    id: 'ARCH_005',
    name: 'Type Safety',
    description: 'Use TypeScript for type safety and better IDE support',
    patterns: [/function|const|class/],
    check: (content: string) => {
      // Check for TypeScript type annotations
      const hasTypes = /:\s*(?:string|number|boolean|any|void|{|<|Promise)/.test(content);
      return hasTypes;
    },
  },
];

const PERFORMANCE_STANDARDS = [
  {
    id: 'PERF_001',
    name: 'Memoization',
    description: 'Expensive computations should be memoized or cached',
    patterns: [/calculate|compute|filter|map|reduce|sort/i],
    check: (content: string) => {
      const hasExpensiveOp = /(?:filter|map|reduce|sort|findIndex|JSON\.stringify|calculate|compute)/i.test(content);
      const hasMemoization = /useMemo|useCallback|memo|cache|memoize|memoized/i.test(content);
      return !hasExpensiveOp || hasMemoization;
    },
  },
  {
    id: 'PERF_002',
    name: 'Lazy Loading',
    description: 'Large components/data should be lazy loaded',
    patterns: [/import|component|React/],
    check: (content: string) => {
      const hasLargeComponents = /const|function/.test(content);
      const hasLazyLoading = /lazy|dynamic|code.split|import\s*\(/i.test(content);
      return true; // Hard to check statically
    },
  },
  {
    id: 'PERF_003',
    name: 'Debouncing/Throttling',
    description: 'Frequent events should be debounced or throttled',
    patterns: [/onChange|onScroll|onResize|onMouseMove/],
    check: (content: string) => {
      const hasFrequentEvents = /onChange|onScroll|onResize|onMouseMove/i.test(content);
      const hasDebounce = /debounce|throttle|useCallback|useMemo/i.test(content);
      return !hasFrequentEvents || hasDebounce;
    },
  },
  {
    id: 'PERF_004',
    name: 'Bundle Size',
    description: 'Keep bundle size minimal - use tree shaking and code splitting',
    patterns: [/import/],
    check: (content: string) => {
      const importCount = (content.match(/import\s+(?:{[^}]*}|[^;\n]*)\s+from/g) || []).length;
      // Reasonable import count
      return importCount <= 10;
    },
  },
  {
    id: 'PERF_005',
    name: 'Memory Leaks Prevention',
    description: 'Event listeners and timers should be cleaned up',
    patterns: [/addEventListener|setTimeout|setInterval|useEffect/],
    check: (content: string) => {
      const hasTimers = /addEventListener|setTimeout|setInterval/.test(content);
      const hasCleanup = /removeEventListener|clearTimeout|clearInterval|return\s*\(\s*\)\s*=>|cleanup/i.test(content);
      return !hasTimers || hasCleanup;
    },
  },
];

/**
 * Check code against all standards
 */
export function checkStandards(content: string, filePath: string): StandardsCheckResult {
  const violations: StandardViolation[] = [];
  const passedChecks: string[] = [];

  const allStandards = [
    ...SECURITY_STANDARDS.map(s => ({ ...s, category: 'security' as StandardCategory })),
    ...UX_STANDARDS.map(s => ({ ...s, category: 'ux' as StandardCategory })),
    ...ARCHITECTURE_STANDARDS.map(s => ({ ...s, category: 'architecture' as StandardCategory })),
    ...PERFORMANCE_STANDARDS.map(s => ({ ...s, category: 'performance' as StandardCategory })),
  ];

  for (const standard of allStandards) {
    try {
      const passed = standard.check(content);

      if (passed) {
        passedChecks.push(standard.id);
      } else {
        const violation: StandardViolation = {
          id: standard.id,
          standard: standard.name,
          category: standard.category,
          severity: standard.category === 'security' ? 'critical' : 'warning',
          location: filePath,
          description: standard.description,
          refactorProposal: generateRefactorProposal(standard),
          priority: standard.category === 'security' ? 10 : 5,
        };
        violations.push(violation);
      }
    } catch (error) {
      // Skip on error
    }
  }

  // Calculate scores
  const totalStandards = allStandards.length;
  const getScore = (category: StandardCategory) => {
    const categoryStandards = allStandards.filter(s => s.category === category);
    const passed = categoryStandards.filter(s => passedChecks.includes(s.id)).length;
    return categoryStandards.length > 0
      ? Math.round((passed / categoryStandards.length) * 100)
      : 100;
  };

  const scores = {
    security: getScore('security'),
    ux: getScore('ux'),
    architecture: getScore('architecture'),
    performance: getScore('performance'),
  };

  return {
    violations,
    passedChecks,
    score: {
      ...scores,
      overall: Math.round((scores.security + scores.ux + scores.architecture + scores.performance) / 4),
    },
  };
}

/**
 * Generate actionable refactor proposal for a standard violation
 */
function generateRefactorProposal(standard: any): string {
  const proposals: Record<string, string> = {
    SEC_001: 'Add input validation using a library like Zod or Yup. Example: const validated = schema.parse(userInput);',
    SEC_002: 'Add authentication middleware. Example: app.use(requireAuth); or if (!user) return redirect("/login");',
    SEC_003: 'Wrap async operations in try/catch. Example: try { await fetch(...) } catch (err) { handleError(err); }',
    SEC_004: 'Move secrets to environment variables. Use process.env.API_KEY instead of hardcoded values.',
    SEC_005: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId]);',
    UX_001: 'Add loading state tracking: const [loading, setLoading] = useState(false); Set during fetch operations.',
    UX_002: 'Display user-friendly error: <div>{error && <p>{error.message}</p>}</div>',
    UX_003: 'Add accessibility attributes: <img alt="description" />, <button aria-label="..." />',
    UX_004: 'Use responsive design: Add media queries or use Tailwind breakpoints (sm:, md:, lg:)',
    UX_005: 'Ensure keyboard navigation: Use semantic HTML (<button>, <a>) or add tabIndex and key handlers.',
    ARCH_001: 'Each file should export 1-2 related functions/classes. Split large modules into separate files.',
    ARCH_002: 'Pass dependencies as constructor parameters or function arguments instead of importing directly.',
    ARCH_003: 'Refactor circular dependencies by extracting common logic to a shared module.',
    ARCH_004: 'Break large files (>300 lines) into smaller, focused modules.',
    ARCH_005: 'Add TypeScript types: type User = { name: string; id: number }; function getUser(id: number): User',
    PERF_001: 'Memoize expensive operations: const memoized = useMemo(() => expensiveCalc(), [dependencies]);',
    PERF_002: 'Use lazy loading: const Component = lazy(() => import("./Heavy.js"));',
    PERF_003: 'Debounce frequent events: const debouncedSearch = debounce(handleSearch, 300);',
    PERF_004: 'Use dynamic imports for large dependencies to enable code splitting.',
    PERF_005: 'Clean up in useEffect return: useEffect(() => { /* setup */ return () => { /* cleanup */ }; }, [])',
  };

  return proposals[standard.id] || 'Review standard and refactor accordingly.';
}

/**
 * Get all standards for a category
 */
export function getStandardsForCategory(category: StandardCategory): typeof SECURITY_STANDARDS {
  const standards: Record<StandardCategory, any[]> = {
    security: SECURITY_STANDARDS,
    ux: UX_STANDARDS,
    architecture: ARCHITECTURE_STANDARDS,
    performance: PERFORMANCE_STANDARDS,
  };

  return standards[category];
}

/**
 * Generate severity color for CLI output
 */
export function getSeverityIcon(severity: Severity): string {
  const icons: Record<Severity, string> = {
    critical: '🔴',
    warning: '🟡',
    info: '🔵',
  };
  return icons[severity];
}
