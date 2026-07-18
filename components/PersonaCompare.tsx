"use client";

import { features } from "@/lib/features";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function PersonaCompare() {
  const { personas, activeId, selectPersona } = useFinancialContext();

  if (!features.personaCompare) return null;

  return (
    <div className="persona-chips" aria-label="Quick persona switch">
      {personas.map((p) => {
        const short = p.persona.split("—")[0]?.trim().split(" ")[0] ?? p.persona;
        const active = activeId === p.session_id;
        return (
          <button
            key={p.session_id}
            type="button"
            className={`persona-chip ${active ? "persona-chip-active" : ""}`}
            onClick={() => selectPersona(p.session_id)}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
