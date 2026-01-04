/**
 * Context Slice - Type Definitions
 */

export interface ContextResult {
    projectPath: string;
    hasAgents: boolean;
    hasScratchpad: boolean;
    agents?: string;
    scratchpad?: string;
}

export interface StatusResult {
    projectPath: string;
    hasAgents: boolean;
    hasScratchpad: boolean;
    hasMemory: boolean;
}
