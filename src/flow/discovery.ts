/**
 * Flow Discovery Module
 * Finds entry points in the codebase:
 * - API routes (Express, Fastify, etc.)
 * - Event handlers (DOM events, custom events)
 * - Component lifecycle methods
 * - Function exports from pages/routes
 */

import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';

export interface EntryPoint {
  id: string;
  name: string;
  type: 'api_route' | 'event_handler' | 'component_export' | 'page_route' | 'hook' | 'middleware';
  path: string;
  line: number;
  method?: string;
  handler?: string;
  description?: string;
}

export interface DiscoveryResult {
  entryPoints: EntryPoint[];
  totalFound: number;
  discoveryDuration: number;
}

/**
 * Discover all entry points in the codebase
 */
export async function discoverEntryPoints(cwd: string): Promise<DiscoveryResult> {
  const startTime = Date.now();
  const entryPoints: EntryPoint[] = [];
  let pointId = 0;

  // Find TypeScript/JavaScript files
  const tsFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd,
    ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
  });

  for (const file of tsFiles) {
    const filePath = path.join(cwd, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Find API routes (Express, Fastify patterns)
      const apiRoutes = findApiRoutes(content, file);
      entryPoints.push(
        ...apiRoutes.map(r => ({
          ...r,
          id: `entry_${++pointId}`,
        }))
      );

      // Find event handlers
      const eventHandlers = findEventHandlers(content, file);
      entryPoints.push(
        ...eventHandlers.map(h => ({
          ...h,
          id: `entry_${++pointId}`,
        }))
      );

      // Find component exports (React patterns)
      const componentExports = findComponentExports(content, file);
      entryPoints.push(
        ...componentExports.map(c => ({
          ...c,
          id: `entry_${++pointId}`,
        }))
      );

      // Find page routes (Next.js, Remix patterns)
      const pageRoutes = findPageRoutes(content, file);
      entryPoints.push(
        ...pageRoutes.map(p => ({
          ...p,
          id: `entry_${++pointId}`,
        }))
      );

      // Find custom hooks
      const customHooks = findCustomHooks(content, file);
      entryPoints.push(
        ...customHooks.map(h => ({
          ...h,
          id: `entry_${++pointId}`,
        }))
      );

      // Find middleware
      const middleware = findMiddleware(content, file);
      entryPoints.push(
        ...middleware.map(m => ({
          ...m,
          id: `entry_${++pointId}`,
        }))
      );
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return {
    entryPoints,
    totalFound: entryPoints.length,
    discoveryDuration: Date.now() - startTime,
  };
}

/**
 * Find API route definitions (Express, Fastify, etc.)
 */
function findApiRoutes(content: string, filePath: string): EntryPoint[] {
  const routes: EntryPoint[] = [];

  // Express/Fastify route patterns
  const expressPattern = /(?:app|router|server)\.(get|post|put|delete|patch|head|options)\(['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?(function\s+\w+|\(.*?\)\s*=>|\w+)\s*[{(]/gm;

  let match;
  let lineNum = 1;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineMatch = expressPattern.exec(line);

    if (lineMatch) {
      const [, method, route, handler] = lineMatch;
      routes.push({
        id: '',
        name: `${method.toUpperCase()} ${route}`,
        type: 'api_route',
        path: filePath,
        line: i + 1,
        method: method.toUpperCase(),
        handler: handler.trim(),
        description: `API endpoint ${method.toUpperCase()} ${route}`,
      });
    }
  }

  // Reset regex state
  expressPattern.lastIndex = 0;

  return routes;
}

/**
 * Find event handlers (DOM events, custom events)
 */
function findEventHandlers(content: string, filePath: string): EntryPoint[] {
  const handlers: EntryPoint[] = [];

  // addEventListener patterns
  const eventPattern = /\.(addEventListener|on(?:Click|Change|Submit|Focus|Blur|Input|Hover|Load))\(['"`]?(\w+)['"`]?\s*,\s*(?:async\s+)?(function\s+\w+|\(.*?\)\s*=>)/gm;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = eventPattern.exec(line)) !== null) {
      const [, method, eventName, handler] = match;
      handlers.push({
        id: '',
        name: `${eventName} event handler`,
        type: 'event_handler',
        path: filePath,
        line: i + 1,
        handler: handler.trim(),
        description: `Event handler for "${eventName}"`,
      });
    }
  }

  // Reset regex state
  eventPattern.lastIndex = 0;

  return handlers;
}

/**
 * Find React/Vue component exports
 */
function findComponentExports(content: string, filePath: string): EntryPoint[] {
  const exports: EntryPoint[] = [];

  // Check if file looks like a component
  if (!filePath.match(/\.(tsx|jsx|vue)$/)) {
    return exports;
  }

  // React component patterns
  const componentPattern = /(?:export\s+(?:default\s+)?function\s+(\w+)|export\s+(?:default\s+)?const\s+(\w+)\s*=|export\s+(?:default\s+)?\(|function\s+(\w+)\s*\(\s*(?:props|{|\))|const\s+(\w+)\s*=\s*(?:\([^)]*\)|{|\[)\s*=>)/gm;

  const lines = content.split('\n');
  let match;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    componentPattern.lastIndex = 0;

    if ((match = componentPattern.exec(line)) !== null) {
      const componentName = match[1] || match[2] || match[3] || match[4] || 'Component';

      if (line.includes('export') || (i > 0 && content.substring(0, content.indexOf(line.substring(0, 20))).includes('export'))) {
        exports.push({
          id: '',
          name: componentName,
          type: 'component_export',
          path: filePath,
          line: i + 1,
          description: `React/Vue component: ${componentName}`,
        });
      }
    }
  }

  return exports;
}

/**
 * Find Next.js/Remix page routes
 */
function findPageRoutes(content: string, filePath: string): EntryPoint[] {
  const routes: EntryPoint[] = [];

  // Check if in pages directory
  if (!filePath.match(/\/(pages|app|routes)\//)) {
    return routes;
  }

  // Check for default export (page component)
  if (content.includes('export default')) {
    const routePath = filePath
      .replace(/\.(tsx|jsx|ts|js)$/, '')
      .replace(/\/page$/, '')
      .replace(/\/?index$/, '');

    routes.push({
      id: '',
      name: `Route: ${routePath}`,
      type: 'page_route',
      path: filePath,
      line: 1,
      description: `Page route: ${routePath}`,
    });
  }

  // Look for API route handlers (getServerSideProps, loader, etc.)
  const loaderPattern = /export\s+(?:async\s+)?(?:function\s+\w+|const\s+\w+\s*=.*=>)\s*\(.*(?:request|params|context)/gm;

  if (loaderPattern.test(content)) {
    routes.push({
      id: '',
      name: `Data loader: ${filePath}`,
      type: 'page_route',
      path: filePath,
      line: 1,
      description: `Server-side data loader`,
    });
  }

  return routes;
}

/**
 * Find custom React hooks
 */
function findCustomHooks(content: string, filePath: string): EntryPoint[] {
  const hooks: EntryPoint[] = [];

  // Check if file looks like a hooks file
  if (!filePath.includes('hook') && !filePath.includes('use')) {
    return hooks;
  }

  const hookPattern = /(?:export\s+)?(?:function|const)\s+(use\w+)\s*\(/gm;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    hookPattern.lastIndex = 0;

    let match;
    while ((match = hookPattern.exec(line)) !== null) {
      const hookName = match[1];
      hooks.push({
        id: '',
        name: hookName,
        type: 'hook',
        path: filePath,
        line: i + 1,
        description: `Custom React hook: ${hookName}`,
      });
    }
  }

  return hooks;
}

/**
 * Find middleware functions
 */
function findMiddleware(content: string, filePath: string): EntryPoint[] {
  const middleware: EntryPoint[] = [];

  // Middleware patterns
  const middlewarePattern = /(?:export\s+)?(?:function|const)\s+(\w+)\s*\(\s*(?:req|request|ctx|context|next)[^)]*\)\s*(?::|=>|{)/gm;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    middlewarePattern.lastIndex = 0;

    let match;
    while ((match = middlewarePattern.exec(line)) !== null) {
      const middlewareName = match[1];

      // Only include if it looks like middleware (not a normal function)
      if (middlewareName.includes('middleware') || middlewareName.includes('handler') ||
          middlewareName.includes('Middleware') || middlewareName.includes('Handler')) {
        middleware.push({
          id: '',
          name: middlewareName,
          type: 'middleware',
          path: filePath,
          line: i + 1,
          description: `Middleware: ${middlewareName}`,
        });
      }
    }
  }

  return middleware;
}
