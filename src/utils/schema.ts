import matter from "gray-matter";
import { z } from "zod";

export const RuleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  version: z.string().default("1.0.0"),
  priority: z.enum(["highest", "high", "normal", "low"]).optional(),
  appliesTo: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  body: z.string(),
});
export type ArelaRule = z.infer<typeof RuleSchema>;

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  placeholders: z.array(z.string()).optional(),
  body: z.string(),
});
export type ArelaWorkflow = z.infer<typeof WorkflowSchema>;

export type LoadResult<T> = {
  items: T[];
  errors: string[];
};

export type FrontMatterResult = {
  data: Record<string, unknown>;
  content: string;
};

export function parseFrontMatter(md: string): FrontMatterResult {
  const parsed = matter(md);
  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content.trim(),
  };
}
