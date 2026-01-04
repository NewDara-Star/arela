import { z } from "zod";

// ============================================================
// PRD Frontmatter Schema
// ============================================================

export const PRDTypeSchema = z.enum(["feature", "bugfix", "refactor"]);
export type PRDType = z.infer<typeof PRDTypeSchema>;

export const PRDStatusSchema = z.enum(["draft", "approved", "implemented", "verified"]);
export type PRDStatus = z.infer<typeof PRDStatusSchema>;

export const PRDPrioritySchema = z.enum(["high", "medium", "low"]);
export type PRDPriority = z.infer<typeof PRDPrioritySchema>;

export const HandoffSchema = z.object({
    target: z.string(),
    prompt: z.string(),
}).optional();
export type Handoff = z.infer<typeof HandoffSchema>;

export const PRDFrontmatterSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    type: PRDTypeSchema,
    status: PRDStatusSchema,
    priority: PRDPrioritySchema.optional().default("medium"),
    created: z.string().optional(),
    updated: z.string().optional(),
    context: z.array(z.string()).optional().default([]),
    tools: z.array(z.string()).optional().default([]),
    handoff: HandoffSchema,
});
export type PRDFrontmatter = z.infer<typeof PRDFrontmatterSchema>;

// ============================================================
// Parsed PRD Structure
// ============================================================

export interface PRDSection {
    header: string;      // e.g., "User Stories"
    level: number;       // 1 for #, 2 for ##, etc.
    content: string;     // Raw markdown content under header
    lineStart: number;   // Line number where section starts
    lineEnd: number;     // Line number where section ends
}

export interface ParsedPRD {
    frontmatter: PRDFrontmatter;
    title: string;           // First H1 header
    sections: PRDSection[];  // All sections
    raw: string;             // Original content
    path: string;            // File path
}

// ============================================================
// User Story Structure (extracted from PRD)
// ============================================================

export interface UserStory {
    id: string;              // e.g., "US-001"
    title: string;
    asA: string;             // User type
    iWant: string;           // Goal
    soThat: string;          // Benefit
    acceptanceCriteria: string[];
}

// ============================================================
// PRD Summary (for listing)
// ============================================================

export interface PRDSummary {
    path: string;
    id: string;
    title: string;
    type: PRDType;
    status: PRDStatus;
    priority: PRDPriority;
    updated: string | undefined;
}
