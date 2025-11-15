import { z } from "zod";

export interface IOContract {
  name: string; // function/method name
  definition: string; // "add(a: number, b: number): number"
}

export interface TechnicalSummary {
  filePath: string;
  mainResponsibility: string; // 1-2 sentences
  publicAPI: string[]; // List of exported functions/classes
  ioContracts: IOContract[]; // Input/output contracts
  dependencies: string; // Key dependencies summary
  sideEffects: string; // Side effects (DB, network, file system)
  keyAlgorithms?: string; // Notable algorithms or patterns
  metadata: {
    tokenCount: number;
    compressionRatio: number; // original tokens / summary tokens
    synthesizedAt: string;
  };
}

export const IOContractSchema = z.object({
  name: z.string(),
  definition: z.string(),
});

export const TechnicalSummarySchema = z.object({
  filePath: z.string().optional(),
  mainResponsibility: z.string(),
  publicAPI: z.array(z.string()),
  ioContracts: z.array(IOContractSchema),
  dependencies: z.string(),
  sideEffects: z.string(),
  keyAlgorithms: z.string().optional(),
  metadata: z
    .object({
      tokenCount: z.number().optional(),
      compressionRatio: z.number().optional(),
      synthesizedAt: z.string().optional(),
    })
    .optional(),
});

