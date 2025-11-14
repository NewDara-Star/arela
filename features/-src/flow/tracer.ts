/**
 * Flow Tracer Module
 * Traces execution paths through the codebase using AST-like pattern matching
 * Identifies function calls, data flow, and dependencies
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface TraceNode {
  id: string;
  name: string;
  type: 'function' | 'import' | 'variable' | 'class' | 'async_operation';
  file: string;
  line: number;
  dependencies: string[];
  calledBy: string[];
  calls: string[];
  asyncOperations: string[];
  dataFlows: Array<{
    from: string;
    to: string;
    type: string;
  }>;
}

export interface ExecutionPath {
  startPoint: string;
  endPoint: string;
  path: string[];
  depth: number;
  hasAsyncCalls: boolean;
  potentialIssues: string[];
}

export interface TraceResult {
  nodes: TraceNode[];
  executionPaths: ExecutionPath[];
  tracingDuration: number;
}

/**
 * Trace execution paths from entry points through the codebase
 */
export async function traceExecutionPaths(
  cwd: string,
  entryPointName: string
): Promise<TraceResult> {
  const startTime = Date.now();
  const nodes = new Map<string, TraceNode>();
  const visited = new Set<string>();

  // Find all TypeScript/JavaScript files
  const tsFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd,
    ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
  });

  // First pass: create nodes for all functions
  for (const file of tsFiles) {
    const filePath = path.join(cwd, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const functions = extractFunctions(content, file);

      for (const fn of functions) {
        const nodeId = `${file}:${fn.name}`;
        nodes.set(nodeId, {
          id: nodeId,
          name: fn.name,
          type: 'function',
          file,
          line: fn.line,
          dependencies: [],
          calledBy: [],
          calls: [],
          asyncOperations: [],
          dataFlows: [],
        });
      }

      // Extract imports
      const imports = extractImports(content, file);
      for (const imp of imports) {
        const nodeId = `import:${file}:${imp.name}`;
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            id: nodeId,
            name: imp.name,
            type: 'import',
            file,
            line: imp.line,
            dependencies: [],
            calledBy: [],
            calls: [],
            asyncOperations: [],
            dataFlows: [],
          });
        }
      }

      // Extract variables
      const variables = extractVariables(content, file);
      for (const varName of variables) {
        const nodeId = `var:${file}:${varName}`;
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            id: nodeId,
            name: varName,
            type: 'variable',
            file,
            line: 0,
            dependencies: [],
            calledBy: [],
            calls: [],
            asyncOperations: [],
            dataFlows: [],
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Second pass: trace dependencies and calls
  for (const file of tsFiles) {
    const filePath = path.join(cwd, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Find function calls
      const calls = extractFunctionCalls(content, file);
      for (const call of calls) {
        // Find the node that makes this call
        const functions = extractFunctions(content, file);
        for (const fn of functions) {
          if (call.line >= fn.line && call.line <= fn.endLine) {
            const callerNodeId = `${file}:${fn.name}`;
            const callerNode = nodes.get(callerNodeId);
            if (callerNode) {
              callerNode.calls.push(call.name);
            }

            // Find the called function
            const calleeNodeId = `${file}:${call.name}`;
            const calleeNode = nodes.get(calleeNodeId);
            if (calleeNode) {
              calleeNode.calledBy.push(callerNodeId);
            }
          }
        }
      }

      // Find async operations
      const asyncOps = extractAsyncOperations(content, file);
      for (const asyncOp of asyncOps) {
        const functions = extractFunctions(content, file);
        for (const fn of functions) {
          if (asyncOp.line >= fn.line && asyncOp.line <= fn.endLine) {
            const nodeId = `${file}:${fn.name}`;
            const node = nodes.get(nodeId);
            if (node) {
              node.asyncOperations.push(asyncOp.operation);
            }
          }
        }
      }

      // Find data flows
      const dataFlows = extractDataFlows(content, file);
      for (const flow of dataFlows) {
        const functions = extractFunctions(content, file);
        for (const fn of functions) {
          if (flow.line >= fn.line && flow.line <= fn.endLine) {
            const nodeId = `${file}:${fn.name}`;
            const node = nodes.get(nodeId);
            if (node) {
              node.dataFlows.push({
                from: flow.from,
                to: flow.to,
                type: flow.type,
              });
            }
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Generate execution paths from entry point
  const executionPaths: ExecutionPath[] = [];
  const pathsTraced = tracePathsFromNode(
    `Unknown:${entryPointName}`,
    nodes,
    visited,
    []
  );

  for (const tracePath of pathsTraced) {
    if (tracePath.length > 1) {
      executionPaths.push({
        startPoint: tracePath[0],
        endPoint: tracePath[tracePath.length - 1],
        path: tracePath,
        depth: tracePath.length,
        hasAsyncCalls: tracePath.some(nodeId => {
          const node = nodes.get(nodeId);
          return node && node.asyncOperations.length > 0;
        }),
        potentialIssues: detectIssuesInPath(tracePath, nodes),
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    executionPaths,
    tracingDuration: Date.now() - startTime,
  };
}

/**
 * Extract all function definitions from code
 */
function extractFunctions(content: string, filePath: string): Array<{
  name: string;
  line: number;
  endLine: number;
}> {
  const functions: Array<{
    name: string;
    line: number;
    endLine: number;
  }> = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Function declarations
    const fnMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
    if (fnMatch) {
      functions.push({
        name: fnMatch[1],
        line: i + 1,
        endLine: findBlockEnd(lines, i),
      });
    }

    // Arrow functions (const name = ...)
    const arrowMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(.*?\)\s*=>/);
    if (arrowMatch) {
      functions.push({
        name: arrowMatch[1],
        line: i + 1,
        endLine: findBlockEnd(lines, i),
      });
    }

    // Class methods
    const methodMatch = line.match(/^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/);
    if (methodMatch && i > 0 && lines[i - 1].includes('class')) {
      functions.push({
        name: methodMatch[1],
        line: i + 1,
        endLine: findBlockEnd(lines, i),
      });
    }
  }

  return functions;
}

/**
 * Extract all import statements
 */
function extractImports(content: string, filePath: string): Array<{
  name: string;
  line: number;
}> {
  const imports: Array<{
    name: string;
    line: number;
  }> = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // import { name } from '...'
    const namedMatch = line.match(/import\s+\{\s*([^}]+)\s*\}\s+from/);
    if (namedMatch) {
      const names = namedMatch[1].split(',').map(n => n.trim());
      for (const name of names) {
        imports.push({ name, line: i + 1 });
      }
    }

    // import * as name from '...'
    const allMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from/);
    if (allMatch) {
      imports.push({ name: allMatch[1], line: i + 1 });
    }

    // import name from '...'
    const defaultMatch = line.match(/import\s+(\w+)\s+from/);
    if (defaultMatch && !line.includes('{')) {
      imports.push({ name: defaultMatch[1], line: i + 1 });
    }
  }

  return imports;
}

/**
 * Extract variable declarations
 */
function extractVariables(content: string, filePath: string): string[] {
  const variables = new Set<string>();

  const lines = content.split('\n');
  for (const line of lines) {
    // const/let/var declarations
    const match = line.match(/(?:const|let|var)\s+(\w+)\s*[:=]/);
    if (match) {
      variables.add(match[1]);
    }

    // Function parameters
    const paramMatch = line.match(/\(([^)]+)\)/);
    if (paramMatch) {
      const params = paramMatch[1].split(',').map(p => {
        const nameMatch = p.match(/(\w+)\s*[:=]/);
        return nameMatch ? nameMatch[1] : null;
      });
      for (const param of params) {
        if (param) variables.add(param);
      }
    }
  }

  return Array.from(variables);
}

/**
 * Extract function calls within the code
 */
function extractFunctionCalls(content: string, filePath: string): Array<{
  name: string;
  line: number;
}> {
  const calls: Array<{
    name: string;
    line: number;
  }> = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Function calls pattern: name()
    const callPattern = /\b(\w+)\s*\(/g;
    let match;

    while ((match = callPattern.exec(line)) !== null) {
      const name = match[1];
      // Skip keywords
      if (!/^(if|for|while|switch|function|class|return|throw|typeof|instanceof|new|delete|void|await|async)$/.test(name)) {
        calls.push({ name, line: i + 1 });
      }
    }
  }

  return calls;
}

/**
 * Extract async operations (await, Promise, etc.)
 */
function extractAsyncOperations(content: string, filePath: string): Array<{
  operation: string;
  line: number;
}> {
  const operations: Array<{
    operation: string;
    line: number;
  }> = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // await operations
    if (line.includes('await ')) {
      const awaitMatch = line.match(/await\s+(\w+)/);
      if (awaitMatch) {
        operations.push({
          operation: `await ${awaitMatch[1]}`,
          line: i + 1,
        });
      }
    }

    // Promise operations
    if (line.includes('Promise')) {
      operations.push({
        operation: 'Promise',
        line: i + 1,
      });
    }

    // setTimeout/setInterval
    if (line.match(/(?:setTimeout|setInterval|setImmediate)/)) {
      operations.push({
        operation: 'async_timer',
        line: i + 1,
      });
    }
  }

  return operations;
}

/**
 * Extract data flows (variable assignments, returns, etc.)
 */
function extractDataFlows(content: string, filePath: string): Array<{
  from: string;
  to: string;
  type: string;
  line: number;
}> {
  const flows: Array<{
    from: string;
    to: string;
    type: string;
    line: number;
  }> = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Variable assignments
    const assignMatch = line.match(/(?:const|let|var|this\.)\s*(\w+)\s*=\s*(.+?)(?:;|$)/);
    if (assignMatch) {
      flows.push({
        from: assignMatch[2].trim(),
        to: assignMatch[1],
        type: 'assignment',
        line: i + 1,
      });
    }

    // Return statements
    const returnMatch = line.match(/return\s+(.+?)(?:;|$)/);
    if (returnMatch) {
      flows.push({
        from: returnMatch[1].trim(),
        to: '_return',
        type: 'return',
        line: i + 1,
      });
    }
  }

  return flows;
}

/**
 * Find the end line of a code block
 */
function findBlockEnd(lines: string[], startLine: number): number {
  let braceCount = 0;
  let parenCount = 0;
  let foundStart = false;

  for (let i = startLine; i < lines.length && i < startLine + 500; i++) {
    const line = lines[i];

    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) return i + 1;
      }
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (char === '{') foundStart = true;
    }
  }

  return startLine + 50;
}

/**
 * Trace execution paths from a starting node
 */
function tracePathsFromNode(
  nodeId: string,
  nodes: Map<string, TraceNode>,
  visited: Set<string>,
  currentPath: string[],
  maxDepth: number = 10
): string[][] {
  if (visited.has(nodeId) || currentPath.length > maxDepth) {
    return [currentPath];
  }

  visited.add(nodeId);
  const paths: string[][] = [];
  const node = nodes.get(nodeId);

  if (!node) {
    return [currentPath];
  }

  currentPath.push(nodeId);

  if (node.calls.length === 0) {
    paths.push(currentPath);
  } else {
    for (const callName of node.calls) {
      // Try to find the called function
      for (const [key] of nodes) {
        if (key.endsWith(`:${callName}`) || key.includes(callName)) {
          const subPaths = tracePathsFromNode(key, nodes, new Set(visited), [...currentPath], maxDepth);
          paths.push(...subPaths);
          break;
        }
      }
    }
  }

  return paths;
}

/**
 * Detect potential issues in an execution path
 */
function detectIssuesInPath(path: string[], nodes: Map<string, TraceNode>): string[] {
  const issues: string[] = [];

  // Check for circular dependencies
  if (new Set(path).size < path.length) {
    issues.push('Potential circular dependency detected');
  }

  // Check for unhandled async operations
  const hasAsync = path.some(nodeId => {
    const node = nodes.get(nodeId);
    return node && node.asyncOperations.length > 0;
  });

  if (hasAsync) {
    // Check if all async operations are awaited
    for (const nodeId of path) {
      const node = nodes.get(nodeId);
      if (node && node.asyncOperations.length > 0) {
        issues.push(`Async operation in ${node.name} - ensure proper error handling`);
      }
    }
  }

  // Check for missing error handling
  const hasPromises = path.some(nodeId => {
    const node = nodes.get(nodeId);
    return node && node.asyncOperations.some(op => op.includes('Promise'));
  });

  if (hasPromises) {
    issues.push('Promise detected - add .catch() or try/catch for error handling');
  }

  return issues;
}
