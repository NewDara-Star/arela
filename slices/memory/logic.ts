/**
 * Memory Slice - Smart Scratchpad Logic
 */

export interface StructuredUpdate {
    status: "active" | "completed" | "blocked";
    progress: string[];
    decisions: string[];
    nextSteps: string[];
}

export function formatScratchpadUpdate(existing: string, update: StructuredUpdate): string {
    const timestamp = new Date().toISOString();

    let newSection = `\n\n---\n\n## Update: ${timestamp}\n\n`;
    newSection += `**Status:** ${update.status.toUpperCase()}\n\n`;

    if (update.progress.length > 0) {
        newSection += `### Progress\n${update.progress.map(p => `- ${p}`).join("\n")}\n\n`;
    }

    if (update.decisions.length > 0) {
        newSection += `### Key Decisions\n${update.decisions.map(d => `- ${d}`).join("\n")}\n\n`;
    }

    if (update.nextSteps.length > 0) {
        newSection += `### Next Steps\n${update.nextSteps.map(n => `- [ ] ${n}`).join("\n")}\n`;
    }

    return existing + newSection;
}

export function mergeUpdates(existingContent: string, newUpdate: StructuredUpdate): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayHeader = `## Update: ${timestamp}`;

    // If today's header exists, try to append nicely
    if (existingContent.includes(todayHeader)) {
        // Simple heuristic: append to the end for now, but in future could merge sections
        // For MVP transparency, we just add a sub-timestamp
        const time = new Date().toLocaleTimeString();
        let append = `\n\n### ${time}\n`;

        if (newUpdate.status) append += `**Status:** ${newUpdate.status.toUpperCase()}\n`;
        if (newUpdate.progress.length) append += `**Progress:**\n${newUpdate.progress.map(p => `- ${p}`).join("\n")}\n`;
        if (newUpdate.decisions.length) append += `**Decisions:**\n${newUpdate.decisions.map(d => `- ${d}`).join("\n")}\n`;

        return existingContent + append;
    }

    // Otherwise, create new major section
    return formatScratchpadUpdate(existingContent, newUpdate);
}
