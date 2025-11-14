import path from "node:path";
import fs from "fs-extra";
import yaml from "yaml";

export interface FlowStep {
  action: "navigate" | "click" | "type" | "waitFor" | "screenshot";
  target?: string;
  selector?: string;
  value?: string;
  name?: string;
}

export interface Flow {
  name: string;
  steps: FlowStep[];
}

/**
 * Load a flow from .arela/flows/ directory
 */
export async function loadFlow(flowName: string, cwd = process.cwd()): Promise<Flow> {
  const flowsDir = path.join(cwd, ".arela", "flows");
  const flowPath = path.join(flowsDir, `${flowName}.yml`);

  // Check if flow file exists
  if (!(await fs.pathExists(flowPath))) {
    // Try .yaml extension
    const altPath = path.join(flowsDir, `${flowName}.yaml`);
    if (!(await fs.pathExists(altPath))) {
      throw new Error(
        `Flow "${flowName}" not found. Expected at ${flowPath} or ${altPath}`
      );
    }
    return loadFlowFromFile(altPath);
  }

  return loadFlowFromFile(flowPath);
}

/**
 * Load and parse flow from file
 */
async function loadFlowFromFile(filePath: string): Promise<Flow> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return parseFlow(content);
  } catch (error) {
    throw new Error(
      `Failed to load flow from ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Parse YAML flow definition
 */
export function parseFlow(yamlContent: string): Flow {
  try {
    const parsed = yaml.parse(yamlContent);

    // Validate flow structure
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Flow must be a valid YAML object");
    }

    if (!parsed.name || typeof parsed.name !== "string") {
      throw new Error("Flow must have a 'name' field");
    }

    if (!Array.isArray(parsed.steps)) {
      throw new Error("Flow must have a 'steps' array");
    }

    // Validate each step
    for (let i = 0; i < parsed.steps.length; i++) {
      const step = parsed.steps[i];
      validateStep(step, i);
    }

    return parsed as Flow;
  } catch (error) {
    throw new Error(`Failed to parse flow YAML: ${(error as Error).message}`);
  }
}

/**
 * Validate a single flow step
 */
function validateStep(step: any, index: number): void {
  if (!step || typeof step !== "object") {
    throw new Error(`Step ${index + 1} must be an object`);
  }

  if (!step.action || typeof step.action !== "string") {
    throw new Error(`Step ${index + 1} must have an 'action' field`);
  }

  const validActions = ["navigate", "click", "type", "waitFor", "screenshot"];
  if (!validActions.includes(step.action)) {
    throw new Error(
      `Step ${index + 1} has invalid action "${step.action}". Valid actions: ${validActions.join(", ")}`
    );
  }

  // Validate action-specific requirements
  switch (step.action) {
    case "navigate":
      if (!step.target) {
        throw new Error(`Step ${index + 1} (navigate) requires 'target' field`);
      }
      break;

    case "click":
    case "waitFor":
      if (!step.selector) {
        throw new Error(
          `Step ${index + 1} (${step.action}) requires 'selector' field`
        );
      }
      break;

    case "type":
      if (!step.selector) {
        throw new Error(`Step ${index + 1} (type) requires 'selector' field`);
      }
      if (!step.value) {
        throw new Error(`Step ${index + 1} (type) requires 'value' field`);
      }
      break;

    case "screenshot":
      // Optional name field, no required fields
      break;
  }
}

/**
 * Get default flow if none specified
 */
export function getDefaultFlow(): Flow {
  return {
    name: "Default Flow",
    steps: [
      {
        action: "navigate",
        target: "/",
      },
      {
        action: "screenshot",
        name: "homepage",
      },
    ],
  };
}

/**
 * List available flows in .arela/flows/
 */
export async function listFlows(cwd = process.cwd()): Promise<string[]> {
  const flowsDir = path.join(cwd, ".arela", "flows");

  if (!(await fs.pathExists(flowsDir))) {
    return [];
  }

  const files = await fs.readdir(flowsDir);
  return files
    .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    .map((file) => file.replace(/\.(yml|yaml)$/, ""));
}
