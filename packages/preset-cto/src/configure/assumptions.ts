import fs from "fs-extra";
import path from "path";
import type { Assumption, AssumptionsLedger, AssumptionStatus } from "./types.js";

const ASSUMPTIONS_FILE = ".arela/assumptions.json";

export async function loadAssumptions(cwd: string): Promise<AssumptionsLedger> {
  const filePath = path.join(cwd, ASSUMPTIONS_FILE);
  
  if (!(await fs.pathExists(filePath))) {
    return {};
  }
  
  return await fs.readJson(filePath);
}

export async function saveAssumptions(
  cwd: string,
  ledger: AssumptionsLedger
): Promise<void> {
  const filePath = path.join(cwd, ASSUMPTIONS_FILE);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, ledger, { spaces: 2 });
}

export async function recordAssumption(
  cwd: string,
  assumption: Omit<Assumption, "createdAt" | "updatedAt">
): Promise<void> {
  const ledger = await loadAssumptions(cwd);
  
  const existing = ledger[assumption.id];
  
  ledger[assumption.id] = {
    ...assumption,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await saveAssumptions(cwd, ledger);
}

export async function getAssumption(
  cwd: string,
  id: string
): Promise<Assumption | null> {
  const ledger = await loadAssumptions(cwd);
  return ledger[id] || null;
}

export async function updateAssumptionStatus(
  cwd: string,
  id: string,
  status: AssumptionStatus
): Promise<void> {
  const ledger = await loadAssumptions(cwd);
  
  if (ledger[id]) {
    ledger[id].status = status;
    ledger[id].updatedAt = new Date().toISOString();
    await saveAssumptions(cwd, ledger);
  }
}

export async function confirmAssumptions(
  cwd: string,
  ids: string[]
): Promise<void> {
  const ledger = await loadAssumptions(cwd);
  
  for (const id of ids) {
    if (ledger[id] && ledger[id].status === "assumed") {
      ledger[id].status = "confirmed";
      ledger[id].updatedAt = new Date().toISOString();
    }
  }
  
  await saveAssumptions(cwd, ledger);
}

export async function requireFact(
  cwd: string,
  id: string,
  onAsk: () => Promise<void>
): Promise<void> {
  const assumption = await getAssumption(cwd, id);
  
  if (!assumption || assumption.status === "assumed") {
    await onAsk();
  }
}

export async function listAssumedFacts(cwd: string): Promise<Assumption[]> {
  const ledger = await loadAssumptions(cwd);
  return Object.values(ledger).filter((a) => a.status === "assumed");
}

export async function listConfirmedFacts(cwd: string): Promise<Assumption[]> {
  const ledger = await loadAssumptions(cwd);
  return Object.values(ledger).filter((a) => a.status === "confirmed");
}
