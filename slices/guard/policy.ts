/**
 * Session Guard Policy Enforcement
 * 
 * Validates hypothesis quality and blocks write operations
 * when investigation is incomplete.
 */

import {
    Hypothesis,
    HypothesisSchema,
    WRITE_TOOLS,
    isWriteBlocked,
    InvestigationState,
} from './types.js';
import { getSession, getFilesRead } from './state-machine.js';

// =============================================================================
// Policy Check Result
// =============================================================================

export interface PolicyResult {
    allowed: boolean;
    reason: string;
    suggestion?: string;
}

// =============================================================================
// Write Access Policy
// =============================================================================

export function checkWriteAccess(
    sessionId: string,
    toolName: string
): PolicyResult {
    // Check if this is a write tool
    if (!WRITE_TOOLS.includes(toolName as any)) {
        return {
            allowed: true,
            reason: `Tool '${toolName}' is not restricted.`,
        };
    }

    const session = getSession(sessionId);

    if (isWriteBlocked(session.currentState)) {
        const stateMessages: Record<string, string> = {
            DISCOVERY: 'You must first log the symptom using arela_log_symptom.',
            ANALYSIS: 'You must register a hypothesis using arela_register_hypothesis.',
            VERIFICATION: 'You must confirm your hypothesis using arela_confirm_hypothesis.',
        };

        return {
            allowed: false,
            reason: `WRITE ACCESS DENIED: Cannot use '${toolName}' in ${session.currentState} state.`,
            suggestion: stateMessages[session.currentState] || 'Complete the investigation first.',
        };
    }

    return {
        allowed: true,
        reason: 'Write access granted (IMPLEMENTATION/REVIEW state).',
    };
}

// =============================================================================
// Hypothesis Quality Validation
// =============================================================================

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateHypothesis(
    sessionId: string,
    hypothesis: unknown
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Schema validation
    const schemaResult = HypothesisSchema.safeParse(hypothesis);
    if (!schemaResult.success) {
        for (const issue of schemaResult.error.issues) {
            errors.push(`${issue.path.join('.')}: ${issue.message}`);
        }
        return { valid: false, errors, warnings };
    }

    const validHypothesis = schemaResult.data;

    // 2. Evidence file validation - check if files were actually read
    const filesRead = getFilesRead(sessionId);
    const unreadEvidence = validHypothesis.evidence_files.filter(
        file => !filesRead.includes(file)
    );

    if (unreadEvidence.length > 0) {
        errors.push(
            `HALLUCINATED EVIDENCE: You cited files you haven't read: ${unreadEvidence.join(', ')}. ` +
            `Only cite files you have actually viewed in this session.`
        );
    }

    // 3. Reasoning quality check
    const wordCount = validHypothesis.reasoning_chain.split(/\s+/).length;
    if (wordCount < 20) {
        errors.push(
            `SHALLOW REASONING: Your reasoning chain is only ${wordCount} words. ` +
            `Provide at least 20 words of step-by-step logic.`
        );
    }

    // 4. Root cause specificity
    const rootCauseWords = validHypothesis.suspected_root_cause.split(/\s+/).length;
    if (rootCauseWords < 10) {
        errors.push(
            `VAGUE ROOT CAUSE: Your root cause is only ${rootCauseWords} words. ` +
            `Be specific about the technical cause.`
        );
    }

    // 5. Verification plan quality
    if (validHypothesis.verification_plan.toLowerCase().includes('just try') ||
        validHypothesis.verification_plan.toLowerCase().includes('see if')) {
        warnings.push(
            `WEAK VERIFICATION PLAN: Avoid vague plans like "just try" or "see if". ` +
            `Describe a specific test that would confirm or refute your hypothesis.`
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// =============================================================================
// Malicious Compliance Detection
// =============================================================================

export function checkForMaliciousCompliance(
    sessionId: string,
    newHypothesis: Hypothesis
): PolicyResult {
    const session = getSession(sessionId);

    // Check for repeated reasoning
    for (const prev of session.hypotheses) {
        const similarity = calculateSimilarity(
            prev.reasoning_chain,
            newHypothesis.reasoning_chain
        );

        if (similarity > 0.85) {
            return {
                allowed: false,
                reason: `REPEATED REASONING DETECTED: Your reasoning is ${Math.round(similarity * 100)}% ` +
                    `similar to a previous hypothesis. You must provide genuinely new analysis.`,
                suggestion: 'Re-read the error logs and evidence files. Consider alternative causes.',
            };
        }
    }

    return {
        allowed: true,
        reason: 'Hypothesis appears to be original.',
    };
}

// Simple Jaccard similarity for detecting copy-paste reasoning
function calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
}

// =============================================================================
// Fast Lane Detection (for trivial fixes)
// =============================================================================

export function isFastLaneEligible(prompt: string, diffSize?: number): boolean {
    const trivialKeywords = ['typo', 'rename', 'comment', 'formatting', 'whitespace', 'spelling'];
    const promptLower = prompt.toLowerCase();

    const hasTrivialKeyword = trivialKeywords.some(keyword => promptLower.includes(keyword));
    const isSmallDiff = diffSize !== undefined && diffSize <= 3;

    return hasTrivialKeyword && isSmallDiff;
}

// =============================================================================
// Generate State-Appropriate Error Message
// =============================================================================

export function getBlockedMessage(
    state: InvestigationState,
    attemptedTool: string
): string {
    const messages: Record<InvestigationState, string> = {
        DISCOVERY:
            `🚫 BLOCKED: You attempted to use '${attemptedTool}' but you're in DISCOVERY state.\n\n` +
            `INVESTIGATION REQUIRED:\n` +
            `1. First, analyze the error/issue\n` +
            `2. Use arela_log_symptom to document what you observed\n` +
            `3. Then you can proceed to form a hypothesis\n\n` +
            `The path to write access: DISCOVERY → ANALYSIS → VERIFICATION → IMPLEMENTATION`,

        ANALYSIS:
            `🚫 BLOCKED: You attempted to use '${attemptedTool}' but you're in ANALYSIS state.\n\n` +
            `HYPOTHESIS REQUIRED:\n` +
            `You must use arela_register_hypothesis to document:\n` +
            `- suspected_root_cause (what's actually wrong)\n` +
            `- reasoning_chain (why you think this)\n` +
            `- evidence_files (files you read that support this)\n` +
            `- verification_plan (how to test before fixing)`,

        VERIFICATION:
            `🚫 BLOCKED: You attempted to use '${attemptedTool}' but you're in VERIFICATION state.\n\n` +
            `CONFIRMATION REQUIRED:\n` +
            `Test your hypothesis before modifying code.\n` +
            `Use arela_confirm_hypothesis after verifying, or\n` +
            `Use arela_reject_hypothesis if the test disproved your theory.`,

        IMPLEMENTATION:
            `✅ WRITE ACCESS GRANTED: You may use '${attemptedTool}'.`,

        REVIEW:
            `✅ WRITE ACCESS GRANTED: You may use '${attemptedTool}'.`,
    };

    return messages[state];
}
