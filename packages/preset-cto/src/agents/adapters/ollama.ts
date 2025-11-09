import type { Agent, Ticket, AgentAdapter, RunResult } from "../types.js";
import { appendRunLog } from "../storage.js";

export class OllamaAdapter implements AgentAdapter {
  canRun(agent: Agent, ticket: Ticket): boolean {
    return agent.id.startsWith("ollama:") && agent.transport === "http";
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
      await appendRunLog(cwd, ticket.id, `[${new Date().toISOString()}] Starting Ollama run`);
      await appendRunLog(cwd, ticket.id, `Agent: ${agent.id}`);
      await appendRunLog(cwd, ticket.id, `Model: ${agent.model}`);

      const systemPrompt = this.buildSystemPrompt(ticket);
      const userPrompt = this.buildUserPrompt(ticket);

      await appendRunLog(cwd, ticket.id, `Sending request to ${agent.endpoint}/api/chat`);

      const response = await fetch(`${agent.endpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: agent.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content || "";

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
    return `You are an expert software engineer. Your task is to implement the following ticket.

Return your response as a series of file patches in unified diff format.
Each patch should be clearly marked with the file path.

Format:
\`\`\`diff
--- a/path/to/file.ts
+++ b/path/to/file.ts
@@ -10,5 +10,5 @@
 // diff content
\`\`\`

Be precise, follow best practices, and ensure all changes are correct.`;
  }

  private buildUserPrompt(ticket: Ticket): string {
    let prompt = `# ${ticket.title}\n\n`;
    prompt += `${ticket.description}\n\n`;

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
