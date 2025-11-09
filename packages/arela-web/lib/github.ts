import { Octokit } from "octokit";
import { readTemplateFiles } from "@newdara/preset-cto";

export type AgentType = "cursor" | "windsurf" | "claude" | "generic";

export interface InstallOptions {
  repo: string;
  agent: AgentType;
  token: string;
}

const HUSKY_PRE_COMMIT = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
set -e

if [ -f node_modules/@newdara/preset-cto/dist/cli.js ]; then
  node node_modules/@newdara/preset-cto/dist/cli.js doctor --eval
elif [ -f packages/preset-cto/dist/cli.js ]; then
  node packages/preset-cto/dist/cli.js doctor --eval
elif [ -f node_modules/@arela/preset-cto/dist/cli.js ]; then
  node node_modules/@arela/preset-cto/dist/cli.js doctor --eval
else
  echo "Arela CLI not found. Failing pre-commit." >&2
  exit 1
fi
`;

const CI_WORKFLOW = `name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - name: Run Arela Doctor
        run: |
          set -e
          if [ -f node_modules/@newdara/preset-cto/dist/cli.js ]; then
            node node_modules/@newdara/preset-cto/dist/cli.js doctor --eval
          else
            npx arela doctor --eval
          fi
`;

const VSCODE_SETTINGS = {
  "files.exclude": {
    "**/.pnpm-store": true,
  },
  "files.watcherExclude": {
    "**/.pnpm-store/**": true,
  },
  "search.exclude": {
    "**/.arela": false,
  },
  "search.useIgnoreFiles": true,
};

const BASELINE_REPORT = {
  scores: {
    reasoning: 4.0,
    correctness: 4.0,
    maintainability: 4.0,
    safety: 4.0,
    ux_empathy: 4.0,
  },
  average: 4.0,
  timestamp: new Date().toISOString(),
  note: "Baseline created by arela.dev installer",
};

function getPRBody(agent: AgentType): string {
  return `## Arela Bootstrap

This PR adds Arela rules, CI guardrails, and evaluation baseline to enforce engineering discipline.

### Checklist
- [x] \`.arela/rules/*\` committed
- [x] CI workflow present
- [x] Husky pre-commit installed
- [x] Baseline evaluation added
- [x] Agent: **${agent}**

### Local Verification
\`\`\`bash
npx arela doctor --eval
\`\`\`

### Agent Bootstrap
\`\`\`bash
npx arela agent bootstrap | pbcopy
\`\`\`

Paste the output into your agent's system prompt or rules file.

### What's Enforced
- **Context Integrity**: Agents validate state before acting
- **Ticket Format**: Structured work with acceptance criteria
- **Code Review Gates**: Quality checks before merge
- **Testing Standards**: Pyramid or Trophy strategy
- **Observability**: Structured logs and traces

### Next Steps
1. Review the rules in \`.arela/rules/\`
2. Customize \`*.local.md\` files for overrides
3. Run \`npx arela sync\` to pull future updates
`;
}

async function loadTemplateFilesWithPrefix(): Promise<Record<string, string>> {
  const templates = await readTemplateFiles();
  const result: Record<string, string> = {};
  
  for (const [file, content] of Object.entries(templates)) {
    result[`.arela/${file}`] = content;
  }
  
  return result;
}

export async function installArela(options: InstallOptions): Promise<void> {
  const { repo, agent, token } = options;
  const [owner, name] = repo.split("/");

  if (!owner || !name) {
    throw new Error("Invalid repo format. Expected: owner/repo");
  }

  const octo = new Octokit({ auth: token });

  // Get repo info
  const { data: repoData } = await octo.rest.repos.get({ owner, repo: name });
  const defaultBranch = repoData.default_branch;

  // Get base ref
  const { data: baseRef } = await octo.rest.git.getRef({
    owner,
    repo: name,
    ref: `heads/${defaultBranch}`,
  });

  // Create new branch
  const branchName = "chore/arela-bootstrap";
  try {
    await octo.rest.git.createRef({
      owner,
      repo: name,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });
  } catch (error: any) {
    if (error.status === 422) {
      throw new Error(`Branch ${branchName} already exists`);
    }
    throw error;
  }

  // Load template files
  const templateFiles = await loadTemplateFilesWithPrefix();

  // Add additional files
  const files: Record<string, string> = {
    ...templateFiles,
    ".husky/pre-commit": HUSKY_PRE_COMMIT,
    ".github/workflows/arela-doctor.yml": CI_WORKFLOW,
    ".vscode/settings.json": JSON.stringify(VSCODE_SETTINGS, null, 2),
    ".arela/.last-report.json": JSON.stringify(BASELINE_REPORT, null, 2),
  };

  // Create/update files
  for (const [filePath, content] of Object.entries(files)) {
    const encodedContent = Buffer.from(content).toString("base64");

    try {
      // Try to get existing file
      const { data: existingFile } = await octo.rest.repos.getContent({
        owner,
        repo: name,
        path: filePath,
        ref: branchName,
      });

      // Update if exists
      if ("sha" in existingFile) {
        await octo.rest.repos.createOrUpdateFileContents({
          owner,
          repo: name,
          path: filePath,
          message: `chore(arela): update ${filePath}`,
          content: encodedContent,
          branch: branchName,
          sha: existingFile.sha,
        });
      }
    } catch {
      // Create if doesn't exist
      await octo.rest.repos.createOrUpdateFileContents({
        owner,
        repo: name,
        path: filePath,
        message: `chore(arela): add ${filePath}`,
        content: encodedContent,
        branch: branchName,
      });
    }
  }

  // Create PR
  await octo.rest.pulls.create({
    owner,
    repo: name,
    head: branchName,
    base: defaultBranch,
    title: "chore(arela): bootstrap rules, CI guardrails, eval baseline",
    body: getPRBody(agent),
  });
}
