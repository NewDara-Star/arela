
export interface EnforcementRequest {
    issue: string;      // What went wrong (e.g. "Missing README")
    solution: string;   // How to prevent it (e.g. "Check all slice folders")
}

export interface GuardScript {
    filename: string;   // e.g., "scripts/guards/check_slice_readme.ts"
    content: string;    // The actual code
    description: string; // What it does
    command: string;    // How to run it
}

export interface EnforcementResult {
    success: boolean;
    scriptPath: string;
    output: string;
}
