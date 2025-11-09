import type { Agent, Ticket, Grant, Capability } from "../types.js";

interface ScoringWeights {
  capability: number;
  quality: number;
  speed: number;
  cost: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  capability: 0.4,
  quality: 0.25,
  speed: 0.2,
  cost: 0.15,
};

/**
 * Calculate capability match score (0-1)
 * Checks if agent has required capabilities and stack strengths
 */
function calculateCapabilityScore(agent: Agent, ticket: Ticket): number {
  const requiredCapabilities = inferRequiredCapabilities(ticket);
  const agentCapabilityNames = agent.capabilities.map((c) => c.name);

  // Must have all required capabilities
  const hasAllRequired = requiredCapabilities.every((req) =>
    agentCapabilityNames.includes(req)
  );
  if (!hasAllRequired) return 0;

  // Bonus for stack match
  let stackBonus = 0;
  if (ticket.stack && ticket.stack.length > 0) {
    const agentStrengths = agent.capabilities
      .flatMap((c) => c.strengths || [])
      .map((s) => s.toLowerCase());

    const matchCount = ticket.stack.filter((tech) =>
      agentStrengths.some((strength) => strength.includes(tech.toLowerCase()))
    ).length;

    stackBonus = matchCount / ticket.stack.length;
  }

  // Base score + stack bonus (capped at 1.0)
  return Math.min(1.0, 0.7 + stackBonus * 0.3);
}

/**
 * Infer required capabilities from ticket category
 */
function inferRequiredCapabilities(ticket: Ticket): Capability["name"][] {
  switch (ticket.category) {
    case "bug":
      return ["codegen", "tests"];
    case "feature":
      return ["plan", "codegen", "tests"];
    case "refactor":
      return ["refactor", "tests"];
    case "docs":
      return ["doc"];
    default:
      return ["codegen"];
  }
}

/**
 * Check if agent has required scopes in grants
 */
function hasRequiredScopes(agent: Agent, ticket: Ticket, grant: Grant | undefined): boolean {
  if (!grant || !grant.allow) return false;

  const requiredScopes: Grant["scopes"][number][] = ["read"];

  // Add write scope for most operations
  if (ticket.category !== "docs") {
    requiredScopes.push("write");
  }

  // Check if all required scopes are granted
  return requiredScopes.every((scope) => grant.scopes.includes(scope));
}

/**
 * Calculate overall score for an agent on a ticket
 */
export function scoreAgent(
  agent: Agent,
  ticket: Ticket,
  grant: Grant | undefined,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // Reject if no grant or missing required scopes
  if (!hasRequiredScopes(agent, ticket, grant)) {
    return 0;
  }

  const capabilityScore = calculateCapabilityScore(agent, ticket);
  if (capabilityScore === 0) return 0; // Missing required capabilities

  const qualityScore = agent.qualityScore ?? 0.5;
  const speedScore = agent.speedScore ?? 0.5;
  const costScore = agent.costScore ?? 0.5;

  const score =
    weights.capability * capabilityScore +
    weights.quality * qualityScore +
    weights.speed * speedScore +
    weights.cost * (1 - costScore); // Lower cost is better

  return Math.max(0, Math.min(1, score));
}

/**
 * Score all agents and return sorted list with scores
 */
export function scoreAllAgents(
  agents: Agent[],
  ticket: Ticket,
  grants: Grant[]
): Array<{ agent: Agent; score: number }> {
  const grantsMap = new Map(grants.map((g) => [g.agentId, g]));

  const scored = agents
    .map((agent) => ({
      agent,
      score: scoreAgent(agent, ticket, grantsMap.get(agent.id)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}

/**
 * Select primary and backup agents
 */
export function selectAgents(
  agents: Agent[],
  ticket: Ticket,
  grants: Grant[],
  backupCount: number = 2
): {
  primary: Agent | null;
  backups: Agent[];
  scoreBreakdown: Record<string, number>;
} {
  const scored = scoreAllAgents(agents, ticket, grants);

  if (scored.length === 0) {
    return { primary: null, backups: [], scoreBreakdown: {} };
  }

  const primary = scored[0].agent;
  const backups = scored.slice(1, 1 + backupCount).map((s) => s.agent);
  const scoreBreakdown = Object.fromEntries(
    scored.map((s) => [s.agent.id, s.score])
  );

  return { primary, backups, scoreBreakdown };
}
