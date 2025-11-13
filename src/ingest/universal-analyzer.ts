/**
 * Universal Language Analyzer - Supports TypeScript, JavaScript, Python, Go, Rust, etc.
 * Uses regex patterns for universal parsing across languages
 */

import fs from "fs-extra";
import path from "path";
import { FileAnalysis, FileType, ImportInfo, FunctionNode, ApiEndpoint, ApiCall } from "./types.js";
import { determineFileType, getLineCount } from "./file-scanner.js";

/**
 * Language-specific patterns for imports/requires
 */
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  // JavaScript/TypeScript
  javascript: [
    /import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(['"]([^'"]+)['"]\)/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // Dynamic imports
  ],
  typescript: [
    /import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(['"]([^'"]+)['"]\)/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  // Python
  python: [
    /^import\s+([\w.]+)/gm,
    /^from\s+([\w.]+)\s+import/gm,
  ],
  // Go
  go: [
    /import\s+['"]([^'"]+)['"]/g,
    /import\s+\(\s*([^)]+)\s*\)/gs, // Multi-line imports
  ],
  // Rust
  rust: [
    /use\s+([\w:]+)/g,
    /extern\s+crate\s+(\w+)/g,
  ],
  // Ruby
  ruby: [
    /require\s+['"]([^'"]+)['"]/g,
    /require_relative\s+['"]([^'"]+)['"]/g,
  ],
  // PHP
  php: [
    /require\s+['"]([^'"]+)['"]/g,
    /require_once\s+['"]([^'"]+)['"]/g,
    /include\s+['"]([^'"]+)['"]/g,
    /use\s+([\w\\]+)/g,
  ],
  // Java
  java: [
    /import\s+([\w.]+)/g,
  ],
  // C#
  csharp: [
    /using\s+([\w.]+)/g,
  ],
};

/**
 * Language-specific patterns for function definitions
 */
const FUNCTION_PATTERNS: Record<string, RegExp[]> = {
  javascript: [
    /function\s+(\w+)\s*\(/g,
    /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
  ],
  typescript: [
    /function\s+(\w+)\s*\(/g,
    /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
  ],
  python: [
    /def\s+(\w+)\s*\(/g,
    /async\s+def\s+(\w+)\s*\(/g,
  ],
  go: [
    /func\s+(\w+)\s*\(/g,
    /func\s+\(\w+\s+\*?\w+\)\s+(\w+)\s*\(/g, // Methods
  ],
  rust: [
    /fn\s+(\w+)\s*\(/g,
    /pub\s+fn\s+(\w+)\s*\(/g,
  ],
  ruby: [
    /def\s+(\w+)/g,
  ],
  php: [
    /function\s+(\w+)\s*\(/g,
    /(?:public|private|protected)\s+function\s+(\w+)\s*\(/g,
  ],
  java: [
    /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/g,
  ],
  csharp: [
    /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)/g,
  ],
};

/**
 * Language-specific patterns for API endpoints
 */
const API_ENDPOINT_PATTERNS: Record<string, RegExp[]> = {
  javascript: [
    /app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g,
    /router\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g,
    /@(Get|Post|Put|Delete|Patch)\s*\(['"]([^'"]+)['"]/g, // NestJS
  ],
  typescript: [
    /app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g,
    /router\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g,
    /@(Get|Post|Put|Delete|Patch)\s*\(['"]([^'"]+)['"]/g,
  ],
  python: [
    /@app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g, // FastAPI
    /@router\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g,
    /@route\s*\(['"]([^'"]+)['"],?\s*methods\s*=\s*\[['"](\w+)['"]\]/g, // Flask
  ],
  go: [
    // Gin framework
    /\b\w+\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(\s*["']([^"']+)["']/g,
    // Standard library
    /http\.HandleFunc\s*\(\s*["']([^"']+)["']/g,
    // Gorilla mux
    /router\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(\s*["']([^"']+)["']/g,
  ],
  rust: [
    /#\[get\s*\(['"]([^'"]+)['"]\)\]/g,
    /#\[post\s*\(['"]([^'"]+)['"]\)\]/g,
    /#\[put\s*\(['"]([^'"]+)['"]\)\]/g,
    /#\[delete\s*\(['"]([^'"]+)['"]\)\]/g,
  ],
  ruby: [
    /(get|post|put|delete|patch)\s+['"]([^'"]+)['"]/g,
  ],
  php: [
    /Route::(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g, // Laravel
  ],
  java: [
    /@(Get|Post|Put|Delete|Patch)Mapping\s*\(['"]([^'"]+)['"]/g, // Spring
  ],
  csharp: [
    /\[Http(Get|Post|Put|Delete|Patch)\s*\(['"]([^'"]+)['"]\)\]/g, // ASP.NET
  ],
};

/**
 * Language-specific patterns for API calls
 */
const API_CALL_PATTERNS: RegExp[] = [
  /fetch\s*\(['"]([^'"]+)['"]/g,
  /axios\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g,
  /requests\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g, // Python
  /http\.(Get|Post|Put|Delete|Patch)\s*\(['"]([^'"]+)['"]/g, // Go
  /HttpClient\.(GetAsync|PostAsync|PutAsync|DeleteAsync)\s*\(['"]([^'"]+)['"]/g, // C#
];

/**
 * Detect language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.java': 'java',
    '.cs': 'csharp',
  };
  return languageMap[ext] || 'unknown';
}

/**
 * Extract imports using regex patterns
 */
function extractImports(content: string, language: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const patterns = IMPORT_PATTERNS[language] || [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let modulePath = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Special handling for Go multi-line imports
      if (language === 'go' && modulePath.includes('\n')) {
        // Split multi-line import block into individual imports
        const lines = modulePath.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          // Extract quoted string from each line
          const importMatch = trimmed.match(/^["']([^"']+)["']$/);
          if (importMatch) {
            const importPath = importMatch[1];
            if (importPath && !imports.find(i => i.from === importPath)) {
              imports.push({
                from: importPath,
                type: 'named',
                names: [],
                line: lineNumber,
              });
            }
          }
        }
      } else if (modulePath && !imports.find(i => i.from === modulePath)) {
        imports.push({
          from: modulePath,
          type: 'named', // Simplified
          names: [],
          line: lineNumber,
        });
      }
    }
  }

  return imports;
}

/**
 * Extract function definitions using regex patterns
 */
function extractFunctions(content: string, language: string): FunctionNode[] {
  const functions: FunctionNode[] = [];
  const patterns = FUNCTION_PATTERNS[language] || [];
  const lines = content.split('\n');
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      if (name) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        // Check if exported (simple heuristic)
        const lineContent = lines[lineNumber - 1] || '';
        const isExported = /export|public/.test(lineContent);
        
        functions.push({
          name,
          isExported,
          lineStart: lineNumber,
          lineEnd: lineNumber + 10, // Estimate
        });
      }
    }
  }
  
  return functions;
}

/**
 * Extract API endpoints using regex patterns
 */
function extractApiEndpoints(content: string, language: string): Partial<ApiEndpoint>[] {
  const endpoints: Partial<ApiEndpoint>[] = [];
  const patterns = API_ENDPOINT_PATTERNS[language] || [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = (match[1] || 'GET').toUpperCase();
      const path = match[2] || match[1];
      
      if (path && !path.startsWith('@')) {
        endpoints.push({
          method,
          path,
          line: content.substring(0, match.index).split('\n').length,
          fileId: 0, // Will be set during storage
        });
      }
    }
  }
  
  return endpoints as ApiEndpoint[];
}

/**
 * Extract API calls using regex patterns
 */
function extractApiCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  
  for (const pattern of API_CALL_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = (match[1] || 'GET').toUpperCase();
      const url = match[2] || match[1];
      
      if (url) {
        calls.push({
          method,
          url,
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  }
  
  return calls;
}

/**
 * Analyze a file using universal regex-based parsing
 */
export async function analyzeFileUniversal(
  filePath: string,
  fileType?: FileType
): Promise<FileAnalysis> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const language = detectLanguage(filePath);
    const lines = getLineCount(filePath);
    const type = fileType || determineFileType(filePath, content);
    
    return {
      filePath,
      type,
      lines,
      imports: extractImports(content, language),
      exports: [], // Simplified for universal parsing
      functions: extractFunctions(content, language),
      apiEndpoints: extractApiEndpoints(content, language) as ApiEndpoint[],
      apiCalls: extractApiCalls(content),
    };
  } catch (error) {
    // Return empty analysis on error
    return {
      filePath,
      type: 'other',
      lines: 0,
      imports: [],
      exports: [],
      functions: [],
      apiEndpoints: [],
      apiCalls: [],
    };
  }
}
