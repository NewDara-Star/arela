/**
 * Session Guard State Machine
 * 
 * Manages investigation state transitions and persistence.
 */

import {
    SessionState,
    InvestigationState,
    StateTransitions,
    createInitialSession,
    Hypothesis,
    Symptom,
    ESCALATION_THRESHOLD,
} from './types.js';

// In-memory session store (could be SQLite-backed in future)
const sessions = new Map<string, SessionState>();

// =============================================================================
// Session Management
// =============================================================================

export function getSession(sessionId: string): SessionState {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, createInitialSession(sessionId));
    }
    return sessions.get(sessionId)!;
}

export function resetSession(sessionId: string): SessionState {
    const session = createInitialSession(sessionId);
    sessions.set(sessionId, session);
    return session;
}

// =============================================================================
// State Transitions
// =============================================================================

export interface TransitionResult {
    success: boolean;
    previousState: InvestigationState;
    currentState: InvestigationState;
    message: string;
}

function canTransition(from: InvestigationState, to: InvestigationState): boolean {
    const allowedTargets = StateTransitions[from];
    return allowedTargets.includes(to);
}

export function transitionTo(
    sessionId: string,
    targetState: InvestigationState
): TransitionResult {
    const session = getSession(sessionId);
    const previousState = session.currentState;

    if (!canTransition(previousState, targetState)) {
        return {
            success: false,
            previousState,
            currentState: previousState,
            message: `Cannot transition from ${previousState} to ${targetState}. ` +
                `Allowed transitions: ${StateTransitions[previousState].join(', ')}`,
        };
    }

    session.currentState = targetState;
    session.updatedAt = new Date().toISOString();

    return {
        success: true,
        previousState,
        currentState: targetState,
        message: `Transitioned from ${previousState} to ${targetState}`,
    };
}

// =============================================================================
// Symptom Logging (S0 → S1)
// =============================================================================

export interface LogSymptomResult extends TransitionResult {
    symptom?: Symptom;
}

export function logSymptom(
    sessionId: string,
    symptom: Symptom
): LogSymptomResult {
    const session = getSession(sessionId);

    if (session.currentState !== 'DISCOVERY') {
        return {
            success: false,
            previousState: session.currentState,
            currentState: session.currentState,
            message: `Cannot log symptom in ${session.currentState} state. Must be in DISCOVERY state.`,
        };
    }

    session.symptom = symptom;
    const result = transitionTo(sessionId, 'ANALYSIS');

    return {
        ...result,
        symptom,
    };
}

// =============================================================================
// Hypothesis Registration (S1 → S2)
// =============================================================================

export interface RegisterHypothesisResult extends TransitionResult {
    hypothesis?: Hypothesis & { timestamp: string; status: 'pending' };
}

export function registerHypothesis(
    sessionId: string,
    hypothesis: Hypothesis
): RegisterHypothesisResult {
    const session = getSession(sessionId);

    if (session.currentState !== 'ANALYSIS') {
        return {
            success: false,
            previousState: session.currentState,
            currentState: session.currentState,
            message: `Cannot register hypothesis in ${session.currentState} state. Must be in ANALYSIS state.`,
        };
    }

    // Check for escalation threshold
    if (session.failedAttempts >= ESCALATION_THRESHOLD) {
        return {
            success: false,
            previousState: session.currentState,
            currentState: session.currentState,
            message: `ESCALATION REQUIRED: You have ${session.failedAttempts} failed hypotheses. ` +
                `Use arela_escalate to request human assistance.`,
        };
    }

    const timestampedHypothesis = {
        ...hypothesis,
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
    };

    session.hypotheses.push(timestampedHypothesis);
    const result = transitionTo(sessionId, 'VERIFICATION');

    return {
        ...result,
        hypothesis: timestampedHypothesis,
    };
}

// =============================================================================
// Hypothesis Confirmation (S2 → S3)
// =============================================================================

export interface ConfirmHypothesisResult extends TransitionResult {
    message: string;
}

export function confirmHypothesis(
    sessionId: string,
    verification_result: string
): ConfirmHypothesisResult {
    const session = getSession(sessionId);

    if (session.currentState !== 'VERIFICATION') {
        return {
            success: false,
            previousState: session.currentState,
            currentState: session.currentState,
            message: `Cannot confirm hypothesis in ${session.currentState} state. Must be in VERIFICATION state.`,
        };
    }

    // Mark latest hypothesis as confirmed
    const latestHypothesis = session.hypotheses[session.hypotheses.length - 1];
    if (latestHypothesis) {
        latestHypothesis.status = 'confirmed';
    }

    const result = transitionTo(sessionId, 'IMPLEMENTATION');

    return {
        ...result,
        message: `Hypothesis confirmed. Verification: ${verification_result}. ` +
            `WRITE ACCESS GRANTED. You may now modify code.`,
    };
}

// =============================================================================
// Hypothesis Rejection (S2 → S1)
// =============================================================================

export function rejectHypothesis(
    sessionId: string,
    rejection_reason: string
): TransitionResult {
    const session = getSession(sessionId);

    if (session.currentState !== 'VERIFICATION') {
        return {
            success: false,
            previousState: session.currentState,
            currentState: session.currentState,
            message: `Cannot reject hypothesis in ${session.currentState} state. Must be in VERIFICATION state.`,
        };
    }

    // Mark latest hypothesis as rejected
    const latestHypothesis = session.hypotheses[session.hypotheses.length - 1];
    if (latestHypothesis) {
        latestHypothesis.status = 'rejected';
    }

    // Increment failure counter
    session.failedAttempts++;

    const result = transitionTo(sessionId, 'ANALYSIS');

    if (session.failedAttempts >= ESCALATION_THRESHOLD) {
        return {
            ...result,
            message: `Hypothesis rejected: ${rejection_reason}. ` +
                `⚠️ ESCALATION REQUIRED: ${session.failedAttempts} failed attempts. ` +
                `Use arela_escalate to request human help.`,
        };
    }

    return {
        ...result,
        message: `Hypothesis rejected: ${rejection_reason}. ` +
            `Failed attempts: ${session.failedAttempts}/${ESCALATION_THRESHOLD}. ` +
            `Return to ANALYSIS to form a new hypothesis.`,
    };
}

// =============================================================================
// Track File Reads
// =============================================================================

export function trackFileRead(sessionId: string, filePath: string): void {
    const session = getSession(sessionId);
    if (!session.filesRead.includes(filePath)) {
        session.filesRead.push(filePath);
    }
}

export function getFilesRead(sessionId: string): string[] {
    return getSession(sessionId).filesRead;
}

// =============================================================================
// Get Session Status
// =============================================================================

export function getStatus(sessionId: string): {
    state: InvestigationState;
    canWrite: boolean;
    symptom: Symptom | null;
    hypothesisCount: number;
    failedAttempts: number;
    escalationRequired: boolean;
} {
    const session = getSession(sessionId);

    return {
        state: session.currentState,
        canWrite: session.currentState === 'IMPLEMENTATION' || session.currentState === 'REVIEW',
        symptom: session.symptom,
        hypothesisCount: session.hypotheses.length,
        failedAttempts: session.failedAttempts,
        escalationRequired: session.failedAttempts >= ESCALATION_THRESHOLD,
    };
}
