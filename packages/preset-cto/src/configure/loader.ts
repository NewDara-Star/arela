import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import type { Profile, QuestionPack, Answers } from "./types.js";
import { ProfileSchema } from "./types.js";

const PROFILE_FILE = ".arela/profile.json";
const ANSWERS_FILE = ".arela/answers.json";

export async function loadProfile(cwd: string): Promise<Profile> {
  const filePath = path.join(cwd, PROFILE_FILE);
  
  if (!(await fs.pathExists(filePath))) {
    return ProfileSchema.parse({});
  }
  
  const data = await fs.readJson(filePath);
  return ProfileSchema.parse(data);
}

export async function saveProfile(cwd: string, profile: Profile): Promise<void> {
  const filePath = path.join(cwd, PROFILE_FILE);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, profile, { spaces: 2 });
}

export async function loadAnswers(cwd: string): Promise<Answers> {
  const filePath = path.join(cwd, ANSWERS_FILE);
  
  if (!(await fs.pathExists(filePath))) {
    return {};
  }
  
  return await fs.readJson(filePath);
}

export async function saveAnswers(cwd: string, answers: Answers): Promise<void> {
  const filePath = path.join(cwd, ANSWERS_FILE);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, answers, { spaces: 2 });
}

export async function mergeAnswers(
  cwd: string,
  newAnswers: Answers
): Promise<void> {
  const existing = await loadAnswers(cwd);
  const merged = { ...existing, ...newAnswers };
  await saveAnswers(cwd, merged);
}

export async function loadQuestionPacks(
  cwd: string,
  topics?: string[]
): Promise<QuestionPack[]> {
  // Load from preset templates
  const presetDir = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "templates",
    ".arela",
    "questions"
  );
  
  const pattern = topics
    ? `{${topics.join(",")}}.json`
    : "*.json";
  
  const files = await glob(pattern, {
    cwd: presetDir,
    absolute: true,
    nodir: true,
  });
  
  const packs: QuestionPack[] = [];
  
  for (const file of files) {
    try {
      const pack = await fs.readJson(file);
      packs.push(pack);
    } catch (error) {
      console.warn(`Failed to load question pack: ${file}`);
    }
  }
  
  return packs;
}

export function computeMissingKeys(answers: Answers, required: string[]): string[] {
  return required.filter((key) => !(key in answers));
}
