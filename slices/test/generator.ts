import fs from "fs-extra";
import path from "path";
import { askOpenAI } from "../shared/openai.js";
import { getUserStories, getPRD } from "../prd/ops.js";
import { GeneratedTest } from "./types.js";

// Helper to strip markdown code blocks
function cleanMarkdown(text: string): string {
    return text.replace(/```(gherkin|typescript|ts|javascript|js)?/g, "").replace(/```/g, "").trim();
}

export async function generateTests(projectPath: string, prdPath: string): Promise<GeneratedTest> {
    const prd = await getPRD(prdPath);
    const stories = await getUserStories(prdPath);

    if (stories.length === 0) throw new Error("No user stories found in PRD.");

    const featureContext = stories.map(s =>
        `Story ID: ${s.id}\nTitle: ${s.title}\nActor: ${s.asA}\nGoal: ${s.iWant}\nBenefit: ${s.soThat}\nCriteria: ${s.acceptanceCriteria.join("; ")}`
    ).join("\n\n");

    const systemPrompt = "You are a Senior QA Automation Engineer. You write Gherkin feature files and TypeScript step definitions.";

    // 1. Generate Gherkin
    const featurePrompt = `Convert these User Stories into a single Gherkin .feature file content.
Use strict Gherkin syntax (Feature, Scenario, Given, When, Then).
Feature Name: ${prd.title}
Feature ID: ${prd.frontmatter.id}

User Stories:
${featureContext}

Output ONLY the raw Gherkin text.`;

    let featureContent = await askOpenAI(systemPrompt, featurePrompt);
    featureContent = cleanMarkdown(featureContent);

    // 2. Generate Steps
    const stepsPrompt = `Generate TypeScript step definitions for this Gherkin feature using '@cucumber/cucumber'.
Do NOT use Playwright yet, just generic TypeScript steps that log to console.
Imports: import { Given, When, Then } from '@cucumber/cucumber';

Feature:
${featureContent}

Output ONLY the raw TypeScript code.`;

    let stepsContent = await askOpenAI(systemPrompt, stepsPrompt);
    stepsContent = cleanMarkdown(stepsContent);

    // 3. Save Files
    const featureFile = `tests/features/${prd.frontmatter.id}.feature`;
    const stepsFile = `tests/steps/${prd.frontmatter.id}.steps.ts`;

    await fs.outputFile(path.join(projectPath, featureFile), featureContent);
    await fs.outputFile(path.join(projectPath, stepsFile), stepsContent);

    return {
        featureContent,
        stepsContent,
        featurePath: featureFile,
        stepsPath: stepsFile
    };
}
