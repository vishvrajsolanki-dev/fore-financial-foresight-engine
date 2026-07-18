// FORE — lib/personas.ts
// Static demo personas (TASK-004 output), imported at build time — never generated at runtime.
// Regenerate via `node scripts/generate-data.mjs` (deterministic, seeded).

import type { Transaction } from "@/types/financialContext";
import arjun from "@/data/personas/arjun.json";
import meera from "@/data/personas/meera.json";
import rohan from "@/data/personas/rohan.json";

export interface PersonaData {
  persona: string;
  display_name: string;
  monthly_income: number;
  income_bracket: string;
  city_tier: string;
  transactions: Transaction[];
}

export const PERSONAS: PersonaData[] = [arjun, meera, rohan];

export function getPersona(id: string): PersonaData | null {
  return PERSONAS.find((p) => p.persona === id) ?? null;
}
