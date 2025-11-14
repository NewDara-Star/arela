import path from "node:path";
import { readFile } from "node:fs/promises";
import { glob } from "glob";
import { parse } from "yaml";
import { execa } from "execa";
import { compareSchemas, SchemaChange } from "./schema-comparator.js";

export type BreakingChangeType =
  | "removed-endpoint"
  | "removed-operation"
  | "changed-response"
  | "removed-field"
  | "changed-type";

export interface BreakingChange {
  file: string;
  field: string;
  oldValue: string;
  newValue: string;
  severity: "critical" | "major" | "minor";
  type: BreakingChangeType;
  method?: string;
  endpoint?: string;
}

export async function detectBreakingChanges(repoPath: string): Promise<BreakingChange[]> {
  const absoluteRepoPath = repoPath ?? process.cwd();
  const specs = await glob("openapi/**/*.{yaml,yml,json}", {
    cwd: absoluteRepoPath,
    nodir: true,
  });

  const drift: BreakingChange[] = [];

  for (const specPath of specs) {
    const currentSpec = await readOpenAPISpec(absoluteRepoPath, specPath);
    if (!currentSpec) {
      continue;
    }

    const previousSpec = await readPreviousSpec(absoluteRepoPath, specPath);
    if (!previousSpec) {
      continue;
    }

    drift.push(...compareSpecs(currentSpec, previousSpec, specPath));
  }

  return drift;
}

export function compareSpecs(current: any, previous: any, specPath: string): BreakingChange[] {
  const changes: BreakingChange[] = [];
  const currentPaths = current?.paths ?? {};
  const previousPaths = previous?.paths ?? {};

  for (const [endpoint, previousPathObject] of Object.entries(previousPaths)) {
    const currentPathObject = currentPaths[endpoint];

    if (!currentPathObject) {
      changes.push({
        file: specPath,
        type: "removed-endpoint",
        field: endpoint,
        oldValue: endpoint,
        newValue: "removed",
        severity: "critical",
        endpoint,
      });
      continue;
    }

    for (const [method, previousOperation] of Object.entries(previousPathObject as Record<string, any>)) {
      const currentOperation = currentPathObject[method];
      if (!currentOperation) {
        changes.push({
          file: specPath,
          type: "removed-operation",
          field: `${method.toUpperCase()} ${endpoint}`,
          oldValue: `${method.toUpperCase()} ${endpoint}`,
          newValue: "removed",
          severity: "critical",
          method,
          endpoint,
        });
        continue;
      }

      const previousResponses = (previousOperation as any).responses ?? {};
      const currentResponses = currentOperation.responses ?? {};
      const responseCodes = new Set<string>([
        ...Object.keys(previousResponses),
        ...Object.keys(currentResponses),
      ]);

      for (const code of responseCodes) {
        const previousResponse = previousResponses[code];
        const currentResponse = currentResponses[code];

        if (previousResponse && !currentResponse) {
          changes.push({
            file: specPath,
            type: "changed-response",
            field: `${method.toUpperCase()} ${endpoint} ${code}`,
            oldValue: "defined",
            newValue: "missing",
            severity: "major",
            method,
            endpoint,
          });
          continue;
        }

        const currentSchema = getResponseSchema(currentResponse);
        const previousSchema = getResponseSchema(previousResponse);

        if (previousSchema && !currentSchema) {
          changes.push({
            file: specPath,
            type: "changed-response",
            field: `${method.toUpperCase()} ${endpoint} ${code}`,
            oldValue: "schema present",
            newValue: "schema missing",
            severity: "major",
            method,
            endpoint,
          });
          continue;
        }

        if (currentSchema && previousSchema) {
          const schemaChanges = compareSchemas(currentSchema, previousSchema, "");

          for (const schemaChange of schemaChanges) {
            changes.push({
              file: specPath,
              field: schemaChange.field,
              oldValue: schemaChange.oldValue,
              newValue: schemaChange.newValue,
              severity: schemaChange.severity,
              type: schemaChange.type,
              method,
              endpoint,
            });
          }
        }
      }
    }
  }

  return changes;
}

async function readOpenAPISpec(repoPath: string, specPath: string): Promise<any | null> {
  try {
    const absolutePath = path.join(repoPath, specPath);
    const content = await readFile(absolutePath, "utf8");
    return parse(content);
  } catch {
    return null;
  }
}

async function readPreviousSpec(repoPath: string, specPath: string): Promise<any | null> {
  try {
    const { stdout } = await execa("git", ["rev-list", "-n", "2", "HEAD", "--", specPath], {
      cwd: repoPath,
    });

    const commits = stdout.split("\n").filter(Boolean);
    if (commits.length < 2) {
      return null;
    }

    const previousCommit = commits[1];
    const { stdout: specContent } = await execa(
      "git",
      ["show", `${previousCommit}:${specPath}`],
      { cwd: repoPath }
    );

    return parse(specContent);
  } catch {
    return null;
  }
}

function getResponseSchema(response: any): any | undefined {
  return response?.content?.["application/json"]?.schema;
}
