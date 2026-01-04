/**
 * Verification Slice - Gatekeeper Logic
 */

import fs from "fs-extra";
import path from "node:path";

export type VerificationType = "contains" | "regex" | "file_exists";

export interface VerificationRequest {
    claim: string;        // Human readable claim (for logging)
    path: string;         // Relative path to evidence file
    type: VerificationType;
    pattern?: string;     // The string or regex to look for
}

export interface VerificationResult {
    verified: boolean;
    reason: string;
    timestamp: string;
}

/**
 * Verify a claim against a file
 */
export async function verifyClaim(
    projectPath: string,
    request: VerificationRequest
): Promise<VerificationResult> {
    const fullPath = path.resolve(projectPath, request.path);
    const timestamp = new Date().toISOString();

    // 1. Check existence
    const exists = await fs.pathExists(fullPath);

    if (request.type === "file_exists") {
        return {
            verified: exists,
            reason: exists ? `File exists at ${request.path}` : `File NOT found at ${request.path}`,
            timestamp
        };
    }

    if (!exists) {
        return {
            verified: false,
            reason: `Cannot verify content: File ${request.path} does not exist`,
            timestamp
        };
    }

    // 2. Read content
    const content = await fs.readFile(fullPath, "utf-8");

    // 3. Verify
    if (request.type === "contains") {
        if (!request.pattern) throw new Error("Pattern required for 'contains' check");
        const found = content.includes(request.pattern);
        return {
            verified: found,
            reason: found
                ? `Found string "${request.pattern}" in ${request.path}`
                : `String "${request.pattern}" NOT found in ${request.path}`,
            timestamp
        };
    }

    if (request.type === "regex") {
        if (!request.pattern) throw new Error("Pattern required for 'regex' check");
        const regex = new RegExp(request.pattern);
        const found = regex.test(content);
        return {
            verified: found,
            reason: found
                ? `Pattern /${request.pattern}/ matched in ${request.path}`
                : `Pattern /${request.pattern}/ did NOT match in ${request.path}`,
            timestamp
        };
    }

    return {
        verified: false,
        reason: `Unknown verification type: ${request.type}`,
        timestamp
    };
}
