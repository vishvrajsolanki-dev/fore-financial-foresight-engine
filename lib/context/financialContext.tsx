// FORE — lib/context/financialContext.tsx
// Client-side store for the shared financial_context spine (CONTRACT-001).
// Rule: no face computes and displays a number without writing it back here first.
// Every face reads from this provider, so a DECIDE verdict written here is immediately
// visible to AHEAD — the "one system, not three disconnected screens" requirement.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { FinancialContext } from "@/types/financialContext";
import { getPersona, PERSONAS, type PersonaData } from "@/lib/personas";
import { getPastData } from "@/lib/api/pastClient";

function emptyContext(): FinancialContext {
  return {
    session_id: "demo-session",
    persona: "",
    monthly_income: 0,
    archetype: null,
    burn_rate: null,
    transactions: [],
    goal: null,
    last_decide_verdict: null,
    benchmark: null,
  };
}

interface FinancialContextStore {
  ctx: FinancialContext;
  activePersona: PersonaData | null;
  personas: PersonaData[];
  selectPersona: (id: string) => void;
  update: (patch: Partial<FinancialContext>) => void;
}

const StoreContext = createContext<FinancialContextStore | null>(null);

export function FinancialContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ctx, setCtx] = useState<FinancialContext>(emptyContext);
  const [activePersona, setActivePersona] = useState<PersonaData | null>(null);

  const update = useCallback((patch: Partial<FinancialContext>) => {
    setCtx((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectPersona = useCallback((id: string) => {
    const persona = getPersona(id);
    if (!persona) {
      setActivePersona(null);
      setCtx(emptyContext());
      return;
    }
    setActivePersona(persona);
    setCtx({
      ...emptyContext(),
      session_id: `demo-${persona.persona}`,
      persona: persona.persona,
      monthly_income: persona.monthly_income,
      transactions: persona.transactions,
    });
    // Archetype + burn-rate flow through the single client module (lib/api/pastClient.ts) so
    // the PLACEHOLDER-A -> real swap at Checkpoint-1 stays a one-file change.
    void getPastData().then((past) => {
      setCtx((prev) =>
        prev.persona === persona.persona ? { ...prev, ...past } : prev
      );
    });
  }, []);

  return (
    <StoreContext.Provider
      value={{ ctx, activePersona, personas: PERSONAS, selectPersona, update }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useFinancialContext(): FinancialContextStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error(
      "useFinancialContext must be used inside FinancialContextProvider"
    );
  }
  return store;
}
