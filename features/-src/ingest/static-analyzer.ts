/**
 * Static Analyzer - Parses TypeScript/JavaScript files using AST
 */

import { Project, SyntaxKind, ImportDeclaration, ExportDeclaration } from "ts-morph";
import path from "path";
import { FileAnalysis, FileType, ImportInfo, ExportInfo, FunctionNode, ApiEndpoint, ApiCall } from "./types.js";
import { determineFileType, getLineCount } from "./file-scanner.js";

let project: Project | null = null;

/**
 * Initialize the ts-morph project (lazy initialization)
 */
function getProject(): Project {
  if (!project) {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        module: 99,
        jsx: 1, // React
      }
    });
  }
  return project;
}

/**
 * Analyze a single file
 */
export async function analyzeFile(
  filePath: string,
  fileType?: FileType
): Promise<FileAnalysis> {
  const project = getProject();

  try {
    const sourceFile = project.addSourceFileAtPath(filePath);
    const content = sourceFile.getFullText();
    const lines = getLineCount(filePath);
    const type = fileType || determineFileType(filePath, content);

    return {
      filePath,
      type,
      lines,
      imports: extractImports(sourceFile),
      exports: extractExports(sourceFile),
      functions: extractFunctions(sourceFile),
      apiEndpoints: extractApiEndpoints(sourceFile),
      apiCalls: extractApiCalls(sourceFile),
    };
  } catch (error) {
    console.error(`Failed to analyze file ${filePath}:`, error);
    return {
      filePath,
      type: fileType || 'other',
      lines: getLineCount(filePath),
      imports: [],
      exports: [],
      functions: [],
      apiEndpoints: [],
      apiCalls: [],
    };
  }
}

/**
 * Extract import declarations
 */
function extractImports(sourceFile: any): ImportInfo[] {
  const imports: ImportInfo[] = [];

  try {
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const imp of importDeclarations) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      const line = imp.getStartLineNumber();

      // Extract imported names
      const names: string[] = [];

      // Default import
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        names.push(defaultImport.getText());
      }

      // Named imports
      const namedImports = imp.getNamedImports();
      for (const namedImport of namedImports) {
        names.push(namedImport.getName());
      }

      // Namespace import
      const namespaceImport = imp.getNamespaceImport();
      if (namespaceImport) {
        names.push(`* as ${namespaceImport.getName()}`);
      }

      let importType: 'default' | 'named' | 'namespace' = 'named';
      if (defaultImport && namedImports.length === 0 && !namespaceImport) {
        importType = 'default';
      } else if (namespaceImport && !defaultImport) {
        importType = 'namespace';
      }

      imports.push({
        from: moduleSpecifier,
        names: names.length > 0 ? names : [],
        type: importType,
        line,
      });
    }
  } catch (error) {
    // Silently ignore parse errors
  }

  return imports;
}

/**
 * Extract export declarations
 */
function extractExports(sourceFile: any): ExportInfo[] {
  const exports: ExportInfo[] = [];

  try {
    // Export declarations
    const exportDeclarations = sourceFile.getExportDeclarations();
    for (const exp of exportDeclarations) {
      const moduleSpecifier = exp.getModuleSpecifierValue();
      const line = exp.getStartLineNumber();

      if (moduleSpecifier) {
        // Re-export
        exports.push({
          name: `re-export from ${moduleSpecifier}`,
          type: 'named',
          line,
        });
      }
    }

    // Exported functions
    const functions = sourceFile.getFunctions();
    for (const fn of functions) {
      if (fn.isExported()) {
        exports.push({
          name: fn.getName() || 'anonymous',
          type: 'named',
          line: fn.getStartLineNumber(),
        });
      }
    }

    // Exported classes
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      if (cls.isExported()) {
        exports.push({
          name: cls.getName() || 'anonymous',
          type: 'named',
          line: cls.getStartLineNumber(),
        });
      }
    }

    // Exported variables
    const variableDeclarations = sourceFile.getVariableDeclarations();
    for (const varDecl of variableDeclarations) {
      const parent = varDecl.getParent();
      if (parent && parent.getKindName && parent.getKindName() === 'VariableDeclarationList') {
        const parentParent = parent.getParent();
        if (parentParent && parentParent.isKind && parentParent.isKind(SyntaxKind.VariableStatement)) {
          if ((parentParent as any).isExported && (parentParent as any).isExported()) {
            exports.push({
              name: varDecl.getName(),
              type: 'named',
              line: varDecl.getStartLineNumber(),
            });
          }
        }
      }
    }
  } catch (error) {
    // Silently ignore parse errors
  }

  return exports;
}

/**
 * Extract function definitions
 */
function extractFunctions(sourceFile: any): FunctionNode[] {
  const functions: FunctionNode[] = [];

  try {
    const allFunctions = sourceFile.getFunctions();

    for (const fn of allFunctions) {
      functions.push({
        name: fn.getName() || 'anonymous',
        isExported: fn.isExported(),
        lineStart: fn.getStartLineNumber(),
        lineEnd: fn.getEndLineNumber(),
      });
    }

    // Also get arrow functions and function expressions from variable declarations
    const variableDeclarations = sourceFile.getVariableDeclarations();
    for (const varDecl of variableDeclarations) {
      const initializer = varDecl.getInitializer();
      if (initializer) {
        const kind = initializer.getKind();
        // Arrow function or function expression
        if (
          kind === SyntaxKind.ArrowFunction ||
          kind === SyntaxKind.FunctionExpression
        ) {
          const parent = varDecl.getParent();
          const isExported = parent && (parent as any).isExported && (parent as any).isExported();
          functions.push({
            name: varDecl.getName(),
            isExported: !!isExported,
            lineStart: varDecl.getStartLineNumber(),
            lineEnd: varDecl.getEndLineNumber(),
          });
        }
      }
    }
  } catch (error) {
    // Silently ignore parse errors
  }

  return functions;
}

/**
 * Extract API endpoints (Express, REST framework patterns)
 */
function extractApiEndpoints(sourceFile: any): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  try {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expression = call.getExpression().getText();

      // Look for Express/Fastify patterns: app.get(), router.post(), etc.
      const match = expression.match(/^(app|router|server)\.(get|post|put|delete|patch|options|head)\s*$/i);
      if (match) {
        const method = match[2].toUpperCase();
        const args = call.getArguments();

        if (args.length >= 2) {
          // First argument is the path
          const pathArg = args[0].getText().replace(/["'`]/g, '');

          endpoints.push({
            method,
            path: pathArg,
            fileId: 0, // Will be set later
            line: call.getStartLineNumber(),
          });
        }
      }
    }
  } catch (error) {
    // Silently ignore parse errors
  }

  return endpoints;
}

/**
 * Extract API calls (fetch, axios, etc.)
 */
function extractApiCalls(sourceFile: any): ApiCall[] {
  const calls: ApiCall[] = [];

  try {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expression = call.getExpression().getText();
      const args = call.getArguments();

      // fetch() calls
      if (expression === 'fetch' && args.length > 0) {
        const urlArg = args[0].getText().replace(/["'`]/g, '').trim();
        // Try to extract method from second argument (RequestInit)
        let method = 'GET';
        if (args.length > 1) {
          const config = args[1].getText();
          const methodMatch = config.match(/method\s*:\s*['"]([A-Z]+)['"]/);
          if (methodMatch) {
            method = methodMatch[1];
          }
        }

        calls.push({
          method,
          url: urlArg,
          line: call.getStartLineNumber(),
        });
      }

      // axios calls
      if (expression.includes('axios') && args.length > 0) {
        const method = extractAxiosMethod(expression);
        const urlArg = args[0].getText().replace(/["'`]/g, '').trim();

        calls.push({
          method,
          url: urlArg,
          line: call.getStartLineNumber(),
        });
      }
    }
  } catch (error) {
    // Silently ignore parse errors
  }

  return calls;
}

/**
 * Extract HTTP method from axios expression
 */
function extractAxiosMethod(expression: string): string {
  const match = expression.match(/\.(get|post|put|delete|patch|head|options)\s*$/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return 'GET'; // Default to GET
}

/**
 * Clean up resources
 */
export function closeProject(): void {
  if (project) {
    project.getSourceFiles().forEach(file => {
      project!.removeSourceFile(file);
    });
    project = null;
  }
}
