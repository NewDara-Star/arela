import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import { execSync } from "child_process";
import type { RepoGraph, GraphNode, GraphEdge } from "../types.js";

export async function buildRepoGraph(cwd: string): Promise<RepoGraph> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Root repo node
  const rootId = "repo:root";
  nodes.push({
    id: rootId,
    type: "repo",
    name: path.basename(cwd),
    path: cwd,
  });
  
  // Discover linked repos
  await discoverSubmodules(cwd, nodes, edges, rootId);
  await discoverPackageDeps(cwd, nodes, edges, rootId);
  await discoverDockerServices(cwd, nodes, edges, rootId);
  await discoverCIDeps(cwd, nodes, edges, rootId);
  
  return {
    nodes,
    edges,
    root: rootId,
    ts: new Date().toISOString(),
  };
}

async function discoverSubmodules(
  cwd: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootId: string
): Promise<void> {
  const gitmodulesPath = path.join(cwd, ".gitmodules");
  
  if (!(await fs.pathExists(gitmodulesPath))) {
    return;
  }
  
  const content = await fs.readFile(gitmodulesPath, "utf8");
  const submodules = content.match(/\[submodule "(.+?)"\]/g);
  
  if (!submodules) return;
  
  for (const match of submodules) {
    const name = match.replace(/\[submodule "(.+?)"\]/, "$1");
    const nodeId = `repo:${name}`;
    
    nodes.push({
      id: nodeId,
      type: "repo",
      name,
      metadata: { source: "submodule" },
    });
    
    edges.push({
      from: rootId,
      to: nodeId,
      kind: "build",
      label: "submodule",
    });
  }
}

async function discoverPackageDeps(
  cwd: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootId: string
): Promise<void> {
  const pkgPath = path.join(cwd, "package.json");
  
  if (!(await fs.pathExists(pkgPath))) {
    return;
  }
  
  const pkg = await fs.readJson(pkgPath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  for (const [name, version] of Object.entries(deps)) {
    const versionStr = version as string;
    
    // Git URLs
    if (versionStr.startsWith("git+") || versionStr.includes("github.com")) {
      const nodeId = `repo:${name}`;
      
      nodes.push({
        id: nodeId,
        type: "repo",
        name,
        url: versionStr,
        metadata: { source: "package-dep" },
      });
      
      edges.push({
        from: rootId,
        to: nodeId,
        kind: "build",
        label: "npm-dep",
      });
    }
    
    // file: deps
    if (versionStr.startsWith("file:")) {
      const localPath = versionStr.replace("file:", "");
      const nodeId = `repo:${name}`;
      
      nodes.push({
        id: nodeId,
        type: "repo",
        name,
        path: path.join(cwd, localPath),
        metadata: { source: "local-dep" },
      });
      
      edges.push({
        from: rootId,
        to: nodeId,
        kind: "dev",
        label: "local-link",
      });
    }
  }
}

async function discoverDockerServices(
  cwd: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootId: string
): Promise<void> {
  const composeFiles = await glob("docker-compose*.{yml,yaml}", {
    cwd,
    nodir: true,
  });
  
  for (const file of composeFiles) {
    const content = await fs.readFile(path.join(cwd, file), "utf8");
    
    // Simple service extraction (in production, use yaml parser)
    const serviceMatches = content.matchAll(/^\s{2}(\w+):/gm);
    
    for (const match of serviceMatches) {
      const serviceName = match[1];
      
      // Skip common compose keys
      if (["version", "services", "networks", "volumes"].includes(serviceName)) {
        continue;
      }
      
      const nodeId = `service:${serviceName}`;
      
      // Detect service type from image/build
      let type: GraphNode["type"] = "service";
      if (content.includes(`${serviceName}:`) && content.includes("postgres")) {
        type = "db";
      } else if (content.includes("redis")) {
        type = "cache";
      }
      
      nodes.push({
        id: nodeId,
        type,
        name: serviceName,
        metadata: { source: "docker-compose", file },
      });
      
      edges.push({
        from: rootId,
        to: nodeId,
        kind: "runtime",
        label: "compose-service",
      });
    }
  }
}

async function discoverCIDeps(
  cwd: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootId: string
): Promise<void> {
  const ciFiles = await glob(".github/workflows/*.{yml,yaml}", {
    cwd,
    nodir: true,
  });
  
  for (const file of ciFiles) {
    const content = await fs.readFile(path.join(cwd, file), "utf8");
    
    // Look for git clone/checkout of other repos
    const cloneMatches = content.matchAll(/git clone\s+(.+?)(?:\s|$)/g);
    
    for (const match of cloneMatches) {
      const url = match[1];
      const name = url.split("/").pop()?.replace(".git", "") || "unknown";
      const nodeId = `repo:${name}`;
      
      nodes.push({
        id: nodeId,
        type: "repo",
        name,
        url,
        metadata: { source: "ci-workflow" },
      });
      
      edges.push({
        from: rootId,
        to: nodeId,
        kind: "build",
        label: "ci-dep",
      });
    }
  }
}

export async function saveGraph(cwd: string, graph: RepoGraph): Promise<void> {
  const graphPath = path.join(cwd, ".arela", "graph.json");
  await fs.ensureDir(path.dirname(graphPath));
  await fs.writeJson(graphPath, graph, { spaces: 2 });
}

export async function loadGraph(cwd: string): Promise<RepoGraph | null> {
  const graphPath = path.join(cwd, ".arela", "graph.json");
  
  if (!(await fs.pathExists(graphPath))) {
    return null;
  }
  
  return await fs.readJson(graphPath);
}
