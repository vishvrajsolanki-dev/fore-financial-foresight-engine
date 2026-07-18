// FORE — lib/personas.ts
// Static demo personas (TASK-004 output), imported at build time — never generated at runtime.
// Regenerate via `python3 scripts/generate_task004_data.py` (deterministic, seeded).

import type { PersonaDataset } from "@/types/financialContext";
import arjunSaver from "@/data/personas/arjun_saver.json";
import mayaFoodie from "@/data/personas/maya_foodie.json";
import riyaSocial from "@/data/personas/riya_social.json";

export type { PersonaDataset };

export const PERSONAS: PersonaDataset[] = [
  arjunSaver,
  mayaFoodie,
  riyaSocial,
] as PersonaDataset[];

export function getPersona(id: string): PersonaDataset | null {
  return PERSONAS.find((p) => p.persona === id) ?? null;
}
