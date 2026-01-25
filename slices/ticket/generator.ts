import path from "node:path";
import { writeFileOp } from "../fs/ops.js";
import { getJsonPRDFeature } from "../prd/ops.js";
import type { JsonPRDFeature } from "../prd/types.js";
import type { TicketResult } from "./types.js";

function toTicketId(featureId: string): string {
    const match = featureId.match(/^FEAT-(\d+)$/i);
    if (match) return `TKT-${match[1]}`;
    return `TKT-${featureId.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

function slugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "feature";
}

function buildTicketContent(feature: JsonPRDFeature, ticketId: string, sliceSlug: string, prdPath: string): string {
    const frontmatter = [
        "---",
        `id: ${ticketId}`,
        `feature: ${feature.id}`,
        "status: open",
        `created: ${new Date().toISOString()}`,
        "---",
        ""
    ].join("\n");

    const files = [
        `src/features/${sliceSlug}/README.md`,
        `src/features/${sliceSlug}/index.ts`,
        `src/features/${sliceSlug}/types.ts`,
        `src/features/${sliceSlug}/logic.ts`,
    ];

    const acceptance = feature.acceptance_criteria.length
        ? feature.acceptance_criteria.map(c => `- [ ] ${c}`)
        : ["- [ ] Define acceptance criteria for this feature."];

    const constraints = feature.negative_constraints && feature.negative_constraints.length
        ? feature.negative_constraints.map(c => `- ${c}`)
        : ["- None provided."];

    const deps = feature.dependencies && feature.dependencies.length
        ? feature.dependencies.map(d => `- ${d}`)
        : ["- None."];

    return frontmatter +
        `## ${ticketId}: ${feature.name}\n\n` +
        `**Context:**\n` +
        `This ticket is generated from ${prdPath} and implements ${feature.id}.\n\n` +
        `**User Story:** ${feature.user_story}\n\n` +
        `**Task:**\n` +
        `Implement the feature as a vertical slice under \`src/features/${sliceSlug}\`.\n` +
        `Ensure behavior matches the acceptance criteria and respects constraints.\n\n` +
        `**Files:**\n${files.map(f => `- ${f}`).join("\n")}\n\n` +
        `**Acceptance Criteria:**\n${acceptance.join("\n")}\n\n` +
        `**Constraints:**\n${constraints.join("\n")}\n\n` +
        `**Dependencies:**\n${deps.join("\n")}\n\n` +
        `**Mandatory report:**\n` +
        `- Summary\n` +
        `- Confirmation of each acceptance item\n` +
        `- Test outputs\n`;
}

export async function generateTicket(
    projectPath: string,
    prdPath: string,
    featureId: string,
    outputDir = "spec/tickets"
): Promise<TicketResult> {
    if (!prdPath.endsWith(".json")) {
        throw new Error("Ticket generation currently supports JSON PRDs only (spec/prd.json).");
    }

    const feature = await getJsonPRDFeature(prdPath, featureId);
    if (!feature) throw new Error(`Feature not found in JSON PRD: ${featureId}`);

    const ticketId = toTicketId(feature.id);
    const sliceSlug = slugify(feature.name || feature.id);
    const content = buildTicketContent(feature, ticketId, sliceSlug, prdPath);

    const ticketPath = path.join(outputDir, `${ticketId}.md`);
    await writeFileOp(path.join(projectPath, ticketPath), content);

    return { ticketId, ticketPath, content };
}
