import pc from "picocolors";
import { ask } from "./ask.js";
import {
  loadProfile,
  saveProfile,
  loadAnswers,
  saveAnswers,
  loadQuestionPacks,
} from "./loader.js";
import { confirmAssumptions } from "./assumptions.js";
import type { Question } from "./types.js";

export interface ConfigureOptions {
  reset?: boolean;
  only?: string[];
  noninteractive?: boolean;
}

export async function configure(
  cwd: string,
  opts: ConfigureOptions = {}
): Promise<void> {
  console.log(pc.cyan("Configuring Arela...\n"));

  // Reset if requested
  if (opts.reset) {
    await saveAnswers(cwd, {});
    console.log(pc.yellow("Cleared existing answers\n"));
  }

  // Load profile
  const profile = await loadProfile(cwd);
  console.log(pc.dim(`Profile: ${profile.style} / ${profile.tone} / ${profile.humour}\n`));

  // Load existing answers
  const existing = await loadAnswers(cwd);

  // Load question packs
  const packs = await loadQuestionPacks(cwd, opts.only);

  if (packs.length === 0) {
    console.log(pc.yellow("No question packs found"));
    return;
  }

  // Collect all questions
  let allQuestions: Question[] = [];
  for (const pack of packs) {
    allQuestions.push(...pack.questions);
  }

  // Filter to only missing keys if not reset
  if (!opts.reset) {
    allQuestions = allQuestions.filter((q) => {
      return q.writes.some((key) => !(key in existing));
    });
  }

  // Limit questions
  if (allQuestions.length > profile.max_questions) {
    console.log(
      pc.yellow(
        `Limiting to ${profile.max_questions} questions (set in profile.json)\n`
      )
    );
    allQuestions = allQuestions.slice(0, profile.max_questions);
  }

  if (allQuestions.length === 0) {
    console.log(pc.green("✓ All questions already answered"));
    console.log(pc.dim("Run with --reset to reconfigure\n"));
    return;
  }

  // Non-interactive mode
  if (opts.noninteractive) {
    console.log(pc.red("Missing required configuration keys:"));
    for (const q of allQuestions) {
      console.log(pc.dim(`  - ${q.id}: ${q.prompt}`));
    }
    throw new Error("Cannot run in non-interactive mode with missing keys");
  }

  // Ask questions
  console.log(pc.bold(`Asking ${allQuestions.length} questions:\n`));
  const answers = await ask(allQuestions, profile);

  // Merge with existing
  const merged = { ...existing, ...answers };
  await saveAnswers(cwd, merged);

  // Confirm assumptions based on answered keys
  await confirmAssumptions(cwd, Object.keys(answers));

  console.log(pc.green(`\n✓ Configuration saved`));
  console.log(pc.dim(`  Answers: .arela/answers.json`));
  console.log(pc.dim(`  Assumptions confirmed: ${Object.keys(answers).length}`));
}

export * from "./types.js";
export * from "./assumptions.js";
export * from "./loader.js";
export * from "./ask.js";
