export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface CheckItem {
    id: string;
    description: string;
    status: CheckStatus;
    message?: string;
    details?: string;
    required: boolean;
}

export interface ChecklistReport {
    timestamp: string;
    overallStatus: "pass" | "fail";
    items: CheckItem[];
    summary: string;
}

export interface ChecklistOptions {
    rigorous?: boolean; // If true, runs extensive checks (guards, etc)
}
