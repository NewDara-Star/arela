import { z } from "zod";

// Profile configuration
export const ProfileSchema = z.object({
  tone: z.enum(["direct", "friendly", "formal"]).default("direct"),
  humour: z.enum(["dry", "none", "light"]).default("dry"),
  style: z.enum(["naija", "standard", "terse"]).default("naija"),
  ask_before_fix: z.boolean().default(true),
  max_questions: z.number().min(1).max(20).default(8),
});
export type Profile = z.infer<typeof ProfileSchema>;

// Question types
export const QuestionTypeSchema = z.enum([
  "text",
  "number",
  "confirm",
  "select",
  "multiselect",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  type: QuestionTypeSchema,
  prompt: z.string(),
  default: z.any().optional(),
  choices: z.array(z.string()).optional(),
  validate: z.function().optional(),
  writes: z.array(z.string()),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionPackSchema = z.object({
  topic: z.string(),
  questions: z.array(QuestionSchema),
});
export type QuestionPack = z.infer<typeof QuestionPackSchema>;

// Answers storage
export const AnswersSchema = z.record(z.any());
export type Answers = z.infer<typeof AnswersSchema>;

// Assumptions ledger
export const AssumptionStatusSchema = z.enum(["assumed", "confirmed", "rejected"]);
export type AssumptionStatus = z.infer<typeof AssumptionStatusSchema>;

export const AssumptionSchema = z.object({
  id: z.string(),
  assumption: z.string(),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  status: AssumptionStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

export const AssumptionsLedgerSchema = z.record(AssumptionSchema);
export type AssumptionsLedger = z.infer<typeof AssumptionsLedgerSchema>;
