import path from "path";
import { askOpenAI } from "../shared/openai.js";
import { getUserStories, getPRD, getJsonPRDFeature } from "../prd/ops.js";
import { GeneratedTest } from "./types.js";
import { writeFileOp } from "../fs/ops.js";

// Helper to strip markdown code blocks
function cleanMarkdown(text: string): string {
    return text.replace(/```(gherkin|typescript|ts|javascript|js)?/g, "").replace(/```/g, "").trim();
}

export async function generateTests(projectPath: string, prdPath: string, featureId?: string): Promise<GeneratedTest> {
    const isJson = prdPath.endsWith(".json");

    let featureName = "";
    let featureKey = "";
    let featureContext = "";

    if (isJson) {
        if (!featureId) {
            throw new Error("featureId is required when using a JSON PRD (spec/prd.json).");
        }
        const feature = await getJsonPRDFeature(prdPath, featureId);
        if (!feature) throw new Error(`Feature not found in JSON PRD: ${featureId}`);

        featureName = feature.name;
        featureKey = feature.id;
        featureContext = [
            `Feature ID: ${feature.id}`,
            `Priority: ${feature.priority}`,
            `Name: ${feature.name}`,
            `User Story: ${feature.user_story}`,
            `Acceptance Criteria: ${feature.acceptance_criteria.join("; ")}`,
            feature.negative_constraints.length > 0
                ? `Negative Constraints: ${feature.negative_constraints.join("; ")}`
                : ""
        ].filter(Boolean).join("\n");
    } else {
        const prd = await getPRD(prdPath);
        const stories = await getUserStories(prdPath);

        if (stories.length === 0) throw new Error("No user stories found in PRD.");

        featureName = prd.title;
        featureKey = prd.frontmatter.id;
        featureContext = stories.map(s =>
            `Story ID: ${s.id}\nTitle: ${s.title}\nActor: ${s.asA}\nGoal: ${s.iWant}\nBenefit: ${s.soThat}\nCriteria: ${s.acceptanceCriteria.join("; ")}`
        ).join("\n\n");
    }

    const systemPrompt = "You are a Senior QA Automation Engineer. You write Gherkin feature files and TypeScript step definitions.";

    // 1. Generate Gherkin
    const featurePrompt = `Convert this feature into a single Gherkin .feature file content.
Use strict Gherkin syntax (Feature, Scenario, Given, When, Then).
Include 1 happy-path scenario and 2-4 pessimistic (negative) scenarios.
Feature Name: ${featureName}
Feature ID: ${featureKey}

Context:
${featureContext}

Output ONLY the raw Gherkin text.`;

    let featureContent = await askOpenAI(systemPrompt, featurePrompt);
    featureContent = cleanMarkdown(featureContent);

    // 2. Generate Steps
    const stepsPrompt = `Generate TypeScript step definitions for this Gherkin feature using '@cucumber/cucumber'.
Rules:
1. Imports: import { Given, When, Then } from '@cucumber/cucumber';
2. Output ONLY the raw TypeScript code.
3. Deduplicate steps: If multiple scenarios use the exact same step text, generate it ONLY ONCE.
4. Regex Escaping: Cucumber expects regex. Escape special chars like parentheses and slashes.
   - WRONG: Given('user/pass', ...)
   - RIGHT: Given('user\\/pass', ...)
   - WRONG: Then('it works (maybe)', ...)
   - RIGHT: Then('it works \\(maybe\\)', ...)
5. Arguments: Use {string} or {int} for captured arguments.

Feature:
${featureContent}

Output ONLY the raw TypeScript code.`;

    let stepsContent = await askOpenAI(systemPrompt, stepsPrompt);
    stepsContent = cleanMarkdown(stepsContent);

    // 3. Save Files
    const featureFile = `spec/tests/features/${featureKey}.feature`;
    const stepsFile = `spec/tests/steps/${featureKey}.steps.ts`;

    // Use Guarded Ops
    await writeFileOp(path.join(projectPath, featureFile), featureContent);
    await writeFileOp(path.join(projectPath, stepsFile), stepsContent);

    return {
        featureContent,
        stepsContent,
        featurePath: featureFile,
        stepsPath: stepsFile
    };
}
