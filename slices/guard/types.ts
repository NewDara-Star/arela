/**
 * Session Guard Types
 * 
 * Defines the Investigation State Machine states, hypothesis schema,
 * and session state for tracking investigation progress.
 */

import { z } from 'zod';

// =============================================================================
// Investigation State Machine States
// =============================================================================

export const InvestigationStates = ['DISCOVERY', 'ANALYSIS', 'VERIFICATION', 'IMPLEMENTATION', 'REVIEW'] as const;
export type InvestigationState = typeof InvestigationStates[number];

export const StateTransitions: Record<InvestigationState, InvestigationState[]> = {
    DISCOVERY: ['ANALYSIS'],           // Can only go to Analysis
    ANALYSIS: ['VERIFICATION'],        // Can only go to Verification
    VERIFICATION: ['IMPLEMENTATION', 'ANALYSIS'],  // Can confirm (→Impl) or reject (→Analysis)
    IMPLEMENTATION: ['REVIEW'],        // Can only go to Review
    REVIEW: ['DISCOVERY'],             // Reset to start
};

// =============================================================================
// Confidence Levels
// =============================================================================

export const ConfidenceLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type ConfidenceLevel = typeof ConfidenceLevels[number];

// =============================================================================
// Hypothesis Schema (Zod)
// =============================================================================

export const HypothesisSchema = z.object({
    symptom_summary: z.string()
        .min(10, 'Symptom summary must be at least 10 characters')
        .describe('Concise description of the observed error/issue'),

    suspected_root_cause: z.string()
        .min(30, 'Root cause must be at least 30 characters (~10 words)')
        .describe('Technical explanation of why this is happening'),

    evidence_files: z.array(z.string())
        .min(1, 'Must provide at least one evidence file')
        .describe('Files read that support this hypothesis'),

    reasoning_chain: z.string()
        .min(100, 'Reasoning chain must be at least 100 characters (~20 words)')
        .describe('Step-by-step logic connecting symptom to root cause'),

    confidence: z.enum(ConfidenceLevels)
        .describe('Confidence level in this hypothesis'),

    verification_plan: z.string()
        .min(20, 'Verification plan must be at least 20 characters')
        .describe('How to test this hypothesis before fixing'),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

// =============================================================================
// Symptom Log Schema
// =============================================================================

export const SymptomSchema = z.object({
    error_message: z.string()
        .min(5, 'Error message must be at least 5 characters')
        .describe('The error message or symptom observed'),

    context: z.string()
        .optional()
        .describe('Additional context about when/where the error occurred'),

    reproduction_steps: z.array(z.string())
        .optional()
        .describe('Steps to reproduce the issue'),
});

export type Symptom = z.infer<typeof SymptomSchema>;

// =============================================================================
// Session State
// =============================================================================

export interface SessionState {
    id: string;
    currentState: InvestigationState;
    symptom: Symptom | null;
    hypotheses: Array<Hypothesis & {
        timestamp: string;
        status: 'pending' | 'confirmed' | 'rejected';
    }>;
    failedAttempts: number;
    filesRead: string[];         // Track files actually read
    createdAt: string;
    updatedAt: string;
}

export const createInitialSession = (id: string): SessionState => ({
    id,
    currentState: 'DISCOVERY',
    symptom: null,
    hypotheses: [],
    failedAttempts: 0,
    filesRead: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

// =============================================================================
// Blocked Tools per State
// =============================================================================

export const WRITE_TOOLS = [
    'edit_file',
    'write_file',
    'replace_string',
    'create_file',
    'delete_file',
    'git_commit',
    'git_push',
] as const;

export const READ_ONLY_STATES: InvestigationState[] = ['DISCOVERY', 'ANALYSIS', 'VERIFICATION'];

export const isWriteBlocked = (state: InvestigationState): boolean => {
    return READ_ONLY_STATES.includes(state);
};

// =============================================================================
// Escalation Thresholds
// =============================================================================

export const ESCALATION_THRESHOLD = 3; // Failed hypotheses before forced escalation
