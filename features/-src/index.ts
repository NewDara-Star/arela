/**
 * Arela v3.0 - AI-Powered CTO with Multi-Agent Orchestration
 * 
 * Main exports for programmatic usage
 */

// Agent orchestration
export * from './agents/discovery.js';
export * from './agents/orchestrate.js';
export * from './agents/dispatch.js';
export * from './agents/status.js';

// Ticket management
export * from './tickets/parser.js';
export * from './tickets/schema.js';
export * from './tickets/auto-generate.js';

// MCP + RAG
export * from './mcp/server.js';
export * from './rag/index.js';
export * from './memory/index.js';

// Utils
export * from './utils/progress.js';
export * from './utils/schema.js';

// Persona
export * from './persona/loader.js';

// Types
export * from './types.js';
