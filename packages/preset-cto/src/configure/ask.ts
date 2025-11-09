import prompts from "prompts";
import type { Question, Profile, Answers } from "./types.js";

export async function ask(
  questions: Question[],
  profile: Profile
): Promise<Answers> {
  const styled = questions.map((q) => ({
    type: q.type as any,
    name: q.id,
    message: renderPrompt(q.prompt, profile),
    initial: q.default,
    choices: q.choices?.map((c) => ({ title: c, value: c })),
  }));

  const answers = await prompts(styled, {
    onCancel: () => {
      console.log("\nConfiguration cancelled.");
      process.exit(1);
    },
  });

  // Flatten answers based on writes
  const result: Answers = {};
  for (const q of questions) {
    const value = answers[q.id];
    for (const key of q.writes) {
      result[key] = value;
    }
  }

  return result;
}

function renderPrompt(text: string, profile: Profile): string {
  let rendered = text;

  // Style adjustments
  if (profile.style === "naija") {
    rendered = rendered.replace(/^Please\s+/i, "Quick one: ");
    rendered = rendered.replace(/\?$/, "? ");
  } else if (profile.style === "terse") {
    rendered = rendered.replace(/^Please\s+/i, "");
    rendered = rendered.replace(/\s+\(if any\)/g, "");
  }

  // Humour adjustments
  if (profile.humour === "dry") {
    if (!rendered.includes("(") && rendered.length > 40) {
      rendered += "  (no long story)";
    }
  }

  // Tone adjustments
  if (profile.tone === "formal") {
    rendered = rendered.replace(/Quick one:/g, "Please specify:");
  }

  return rendered;
}

export async function askSingle(
  question: Question,
  profile: Profile
): Promise<any> {
  const result = await ask([question], profile);
  return result[question.writes[0]];
}
