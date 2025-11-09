import fs from "fs-extra";
import path from "path";
import os from "os";
import type { Agent } from "../types.js";

export async function discoverIDEAgents(cwd: string): Promise<Agent[]> {
  const agents: Agent[] = [];

  // Cursor
  const cursorRulesPath = path.join(cwd, ".cursor", "rules.md");
  const cursorGlobalPath = path.join(os.homedir(), ".cursor");
  
  if (
    (await fs.pathExists(cursorRulesPath)) ||
    (await fs.pathExists(cursorGlobalPath))
  ) {
    agents.push({
      id: "cursor:workspace",
      kind: "ide",
      transport: "ipc",
      capabilities: [
        { name: "codegen", strengths: ["context-aware", "workspace"] },
        { name: "refactor", strengths: ["context-aware"] },
        { name: "edit", strengths: ["inline"] },
      ],
      costScore: 0.5,
      speedScore: 0.7,
      qualityScore: 0.75,
      tags: ["ide", "context-aware"],
    });
  }

  // Windsurf
  const windsurfPath = path.join(cwd, ".windsurf");
  const windsurfBootstrap = path.join(windsurfPath, "cascade.bootstrap.md");
  
  if (
    (await fs.pathExists(windsurfBootstrap)) ||
    (await fs.pathExists(windsurfPath))
  ) {
    agents.push({
      id: "windsurf:cascade",
      kind: "ide",
      transport: "ipc",
      capabilities: [
        { name: "plan", strengths: ["context-aware", "multi-step"] },
        { name: "codegen", strengths: ["context-aware", "workspace"] },
        { name: "refactor", strengths: ["context-aware", "multi-file"] },
        { name: "edit", strengths: ["inline", "multi-file"] },
      ],
      costScore: 0.5,
      speedScore: 0.75,
      qualityScore: 0.8,
      tags: ["ide", "context-aware", "cascade"],
    });
  }

  // Claude Desktop (check for app)
  const claudeDesktopMac = "/Applications/Claude.app";
  if (await fs.pathExists(claudeDesktopMac)) {
    agents.push({
      id: "claude:desktop",
      kind: "ide",
      transport: "ipc",
      capabilities: [
        { name: "plan", strengths: ["reasoning"] },
        { name: "codegen", strengths: ["general"] },
        { name: "refactor", strengths: ["general"] },
        { name: "doc", strengths: ["technical-writing"] },
      ],
      costScore: 0.6,
      speedScore: 0.7,
      qualityScore: 0.85,
      tags: ["desktop", "reasoning"],
    });
  }

  return agents;
}
