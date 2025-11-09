import type { Agent, Ticket, AgentAdapter, RunResult } from "../types.js";
import { appendRunLog } from "../storage.js";

export class OpenAIAdapter implements AgentAdapter {
  canRun(agent: Agent, ticket: Ticket): boolean {
    return agent.id.startsWith("openai:") && agent.transport === "http";
  }

  async run(params: {
    agent: Agent;
    ticket: Ticket;
    cwd: string;
    dryRun?: boolean;
  }): Promise<RunResult> {
    const { agent, ticket, cwd, dryRun } = params;
    const logPath = `.arela/runs/${ticket.id}/run.log`;

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not found in environment");
      }

      await appendRunLog(cwd, ticket.id, `[${new Date().toISOString()}] Starting OpenAI run`);
      await appendRunLog(cwd, ticket.id, `Agent: ${agent.id}`);
      await appendRunLog(cwd, ticket.id, `Model: ${agent.model}`);

      const systemPrompt = this.buildSystemPrompt(ticket);
      const userPrompt = this.buildUserPrompt(ticket);

      await appendRunLog(cwd, ticket.id, `Sending request to OpenAI API`);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: agent.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      await appendRunLog(cwd, ticket.id, `Response received (${content.length} chars)`);

      // Parse patches from response
      const patches = this.extractPatches(content);
      await appendRunLog(cwd, ticket.id, `Extracted ${patches.length} patches`);

      if (dryRun) {
        await appendRunLog(cwd, ticket.id, `[DRY RUN] Would apply ${patches.length} patches`);
        return {
          success: true,
          patches,
          logPath,
        };
      }

      // In real implementation, apply patches here
      await appendRunLog(cwd, ticket.id, `Run completed successfully`);

      return {
        success: true,
        patches,
        logPath,
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      await appendRunLog(cwd, ticket.id, `ERROR: ${errorMsg}`);

      return {
        success: false,
        logPath,
        error: errorMsg,
      };
    }
  }

  private buildSystemPrompt(ticket: Ticket): string {
    return `You are an expert software engineer implementing a ticket in a production codebase.

Return your response as a series of file patches in unified diff format.
Each patch should be clearly marked with the file path.

Format:
\`\`\`diff
--- a/path/to/file.ts
+++ b/path/to/file.ts
@@ -10,5 +10,5 @@
 // diff content
\`\`\`

Follow these principles:
- Write clean, maintainable code
- Follow existing patterns in the codebase
- Add tests for new functionality
- Update documentation as needed
- Ensure type safety`;
  }

  private buildUserPrompt(ticket: Ticket): string {
    let prompt = `# ${ticket.title}\n\n`;
    prompt += `**Category**: ${ticket.category}\n`;
    prompt += `**Priority**: ${ticket.priority}\n\n`;
    prompt += `## Description\n${ticket.description}\n\n`;

    if (ticket.files && ticket.files.length > 0) {
      prompt += `## Files to modify:\n`;
      for (const file of ticket.files) {
        prompt += `- ${file}\n`;
      }
      prompt += `\n`;
    }

    if (ticket.stack && ticket.stack.length > 0) {
      prompt += `## Tech stack:\n${ticket.stack.join(", ")}\n\n`;
    }

    prompt += `## Acceptance criteria:\n`;
    for (const criterion of ticket.acceptance) {
      prompt += `- [ ] ${criterion}\n`;
    }

    prompt += `\n## Instructions\n`;
    prompt += `Implement the changes to satisfy all acceptance criteria.\n`;
    prompt += `Return only the diffs needed. Be precise and complete.\n`;

    return prompt;
  }

  private extractPatches(content: string): Array<{ file: string; diff: string }> {
    const patches: Array<{ file: string; diff: string }> = [];
    const diffBlockRegex = /```diff\n([\s\S]*?)```/g;

    let match;
    while ((match = diffBlockRegex.exec(content)) !== null) {
      const diffContent = match[1];
      const fileMatch = diffContent.match(/^---\s+a\/(.+)$/m);

      if (fileMatch) {
        patches.push({
          file: fileMatch[1],
          diff: diffContent,
        });
      }
    }

    return patches;
  }
}
