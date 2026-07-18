"use client";

import { features } from "@/lib/features";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function PersonaCompare() {
  const { personas, activeId, selectPersona } = useFinancialContext();

  if (!features.personaCompare) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick persona switch">
      {personas.map((p) => (
        <button
          key={p.session_id}
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeId === p.session_id
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)] hover:bg-[var(--bg-soft)]"
          }`}
          onClick={() => selectPersona(p.session_id)}
        >
          {p.persona.split(" ")[0]}
        </button>
      ))}
    </div>
  );
}
