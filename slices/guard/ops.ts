/**
 * Session Guard Operations
 * 
 * MCP tool implementations for the Investigation State Machine.
 */

import path from 'node:path';
import fs from 'fs-extra';
import {
    Symptom,
    SymptomSchema,
    Hypothesis,
    HypothesisSchema,
} from './types.js';
import {
    getSession,
    resetSession,
    logSymptom,
    registerHypothesis,
    confirmHypothesis,
    rejectHypothesis,
    getStatus,
    trackFileRead,
} from './state-machine.js';
import {
    validateHypothesis,
    checkForMaliciousCompliance,
    checkWriteAccess,
    getBlockedMessage,
    isFastLaneEligible,
} from './policy.js';

// Default session ID (in future, could be per-conversation)
const DEFAULT_SESSION_ID = 'default';

// =============================================================================
// Log Symptom Operation
// =============================================================================

export interface LogSymptomInput {
    error_message: string;
    context?: string;
    reproduction_steps?: string[];
}

export async function logSymptomOp(input: LogSymptomInput): Promise<string> {
    // Validate input
    const parseResult = SymptomSchema.safeParse(input);
    if (!parseResult.success) {
        const errors = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
        return `❌ Invalid symptom data:\n${errors.join('\n')}`;
    }

    const result = logSymptom(DEFAULT_SESSION_ID, parseResult.data);

    if (!result.success) {
        return `❌ ${result.message}`;
    }

    return `✅ Symptom logged. Transitioned to ANALYSIS state.\n\n` +
        `**Symptom Summary:**\n` +
        `- Error: ${input.error_message}\n` +
        (input.context ? `- Context: ${input.context}\n` : '') +
        `\nNext step: Use arela_register_hypothesis to propose a root cause.`;
}

// =============================================================================
// Register Hypothesis Operation
// =============================================================================

export async function registerHypothesisOp(input: unknown): Promise<string> {
    // 1. Validate schema
    const validation = validateHypothesis(DEFAULT_SESSION_ID, input);
    if (!validation.valid) {
        return `❌ Hypothesis rejected:\n\n**Errors:**\n${validation.errors.map(e => `- ${e}`).join('\n')}` +
            (validation.warnings.length > 0
                ? `\n\n**Warnings:**\n${validation.warnings.map(w => `- ${w}`).join('\n')}`
                : '');
    }

    const hypothesis = HypothesisSchema.parse(input);

    // 2. Check for malicious compliance (repeated reasoning)
    const complianceCheck = checkForMaliciousCompliance(DEFAULT_SESSION_ID, hypothesis);
    if (!complianceCheck.allowed) {
        return `❌ ${complianceCheck.reason}\n\n💡 ${complianceCheck.suggestion}`;
    }

    // 3. Register hypothesis
    const result = registerHypothesis(DEFAULT_SESSION_ID, hypothesis);

    if (!result.success) {
        return `❌ ${result.message}`;
    }

    // 4. Auto-append to SCRATCHPAD
    await appendToScratchpad(hypothesis);

    return `✅ Hypothesis registered. Transitioned to VERIFICATION state.\n\n` +
        `**Your Hypothesis:**\n` +
        `- Root Cause: ${hypothesis.suspected_root_cause}\n` +
        `- Confidence: ${hypothesis.confidence}\n` +
        `- Verification Plan: ${hypothesis.verification_plan}\n\n` +
        `Next step: Execute your verification plan, then use:\n` +
        `- arela_confirm_hypothesis if verified\n` +
        `- arela_reject_hypothesis if disproven\n\n` +
        `📝 Hypothesis logged to SCRATCHPAD.md`;
}

// =============================================================================
// Confirm Hypothesis Operation
// =============================================================================

export interface ConfirmHypothesisInput {
    verification_result: string;
}

export async function confirmHypothesisOp(input: ConfirmHypothesisInput): Promise<string> {
    if (!input.verification_result || input.verification_result.length < 10) {
        return `❌ Please provide a meaningful verification result (what test confirmed your hypothesis?)`;
    }

    const result = confirmHypothesis(DEFAULT_SESSION_ID, input.verification_result);

    if (!result.success) {
        return `❌ ${result.message}`;
    }

    return `✅ ${result.message}\n\n` +
        `🟢 **WRITE ACCESS GRANTED**\n\n` +
        `You may now use edit_file, write_file, and other write operations.\n` +
        `Remember to verify your fix after implementation.`;
}

// =============================================================================
// Reject Hypothesis Operation
// =============================================================================

export interface RejectHypothesisInput {
    rejection_reason: string;
}

export async function rejectHypothesisOp(input: RejectHypothesisInput): Promise<string> {
    if (!input.rejection_reason || input.rejection_reason.length < 10) {
        return `❌ Please explain why the hypothesis was disproven (what did the test reveal?)`;
    }

    const result = rejectHypothesis(DEFAULT_SESSION_ID, input.rejection_reason);

    if (!result.success) {
        return `❌ ${result.message}`;
    }

    return `⚠️ ${result.message}\n\n` +
        `You are now back in ANALYSIS state.\n` +
        `Use arela_register_hypothesis to submit a new hypothesis.`;
}

// =============================================================================
// Escalate to Human Operation
// =============================================================================

export interface EscalateInput {
    summary: string;
    attempts_made: string[];
}

export async function escalateOp(input: EscalateInput): Promise<string> {
    const session = getSession(DEFAULT_SESSION_ID);

    // Build handoff artifact
    const handoff = [
        `# 🚨 Human Assistance Requested`,
        ``,
        `## Summary`,
        input.summary,
        ``,
        `## What I Observed`,
        session.symptom ? `**Error:** ${session.symptom.error_message}` : 'No symptom logged.',
        session.symptom?.context ? `**Context:** ${session.symptom.context}` : '',
        ``,
        `## Hypotheses Tested (${session.hypotheses.length})`,
        ...session.hypotheses.map((h, i) =>
            `### Hypothesis ${i + 1} (${h.status})\n` +
            `- **Root Cause:** ${h.suspected_root_cause}\n` +
            `- **Confidence:** ${h.confidence}\n` +
            `- **Reasoning:** ${h.reasoning_chain}\n`
        ),
        ``,
        `## What I Tried`,
        ...input.attempts_made.map(a => `- ${a}`),
        ``,
        `## Current State`,
        `- Session State: ${session.currentState}`,
        `- Failed Attempts: ${session.failedAttempts}`,
        `- Files Read: ${session.filesRead.join(', ') || 'None'}`,
    ].join('\n');

    // Write to SCRATCHPAD
    await appendRawToScratchpad(handoff);

    // Reset session for next investigation
    resetSession(DEFAULT_SESSION_ID);

    return `🚨 **ESCALATION SUBMITTED**\n\n` +
        `I have documented my investigation in SCRATCHPAD.md and reset the session.\n\n` +
        `**Please help me understand:**\n` +
        input.summary + `\n\n` +
        `The human user should now review SCRATCHPAD.md for full context.`;
}

// =============================================================================
// Guard Status Operation
// =============================================================================

export async function guardStatusOp(): Promise<string> {
    const status = getStatus(DEFAULT_SESSION_ID);

    const stateEmoji: Record<string, string> = {
        DISCOVERY: '🔍',
        ANALYSIS: '🧠',
        VERIFICATION: '🧪',
        IMPLEMENTATION: '🟢',
        REVIEW: '✅',
    };

    return `**Session Guard Status**\n\n` +
        `- State: ${stateEmoji[status.state]} ${status.state}\n` +
        `- Write Access: ${status.canWrite ? '✅ GRANTED' : '🔒 BLOCKED'}\n` +
        `- Hypotheses Submitted: ${status.hypothesisCount}\n` +
        `- Failed Attempts: ${status.failedAttempts}\n` +
        `- Escalation Required: ${status.escalationRequired ? '⚠️ YES' : 'No'}\n` +
        (status.symptom ? `\n**Current Symptom:** ${status.symptom.error_message}` : '');
}

// =============================================================================
// Check Write Access (for intercepting edit_file calls)
// =============================================================================

export function checkWriteAccessOp(toolName: string): { allowed: boolean; message: string } {
    const status = getStatus(DEFAULT_SESSION_ID);
    const result = checkWriteAccess(DEFAULT_SESSION_ID, toolName);

    if (!result.allowed) {
        return {
            allowed: false,
            message: getBlockedMessage(status.state, toolName),
        };
    }

    return {
        allowed: true,
        message: result.reason,
    };
}

// =============================================================================
// Track File Read (called when read_file is used)
// =============================================================================

export function trackFileReadOp(filePath: string): void {
    trackFileRead(DEFAULT_SESSION_ID, filePath);
}

// =============================================================================
// Fast Lane Check
// =============================================================================

export function checkFastLane(prompt: string, diffSize?: number): boolean {
    return isFastLaneEligible(prompt, diffSize);
}

// =============================================================================
// SCRATCHPAD Integration
// =============================================================================

async function appendToScratchpad(hypothesis: Hypothesis): Promise<void> {
    const scratchpadPath = path.join(process.cwd(), 'SCRATCHPAD.md');

    const entry = [
        ``,
        `## Investigation: ${new Date().toISOString()}`,
        ``,
        `**Symptom:** ${getSession(DEFAULT_SESSION_ID).symptom?.error_message || 'Unknown'}`,
        ``,
        `**Hypothesis:** ${hypothesis.suspected_root_cause}`,
        ``,
        `**Evidence:** ${hypothesis.evidence_files.join(', ')}`,
        ``,
        `**Reasoning:** ${hypothesis.reasoning_chain}`,
        ``,
        `**Confidence:** ${hypothesis.confidence}`,
        ``,
        `**Verification Plan:** ${hypothesis.verification_plan}`,
        ``,
        `---`,
    ].join('\n');

    try {
        await fs.appendFile(scratchpadPath, entry);
    } catch (error) {
        // SCRATCHPAD might not exist, ignore
    }
}

async function appendRawToScratchpad(content: string): Promise<void> {
    const scratchpadPath = path.join(process.cwd(), 'SCRATCHPAD.md');

    try {
        await fs.appendFile(scratchpadPath, `\n\n${content}\n\n---\n`);
    } catch (error) {
        // Ignore if file doesn't exist
    }
}
