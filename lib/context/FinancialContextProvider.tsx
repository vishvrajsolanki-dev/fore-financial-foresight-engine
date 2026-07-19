// FORE — lib/context/FinancialContextProvider.tsx
// Demo mode: client-side CSV + personas. Full-stack: PostgreSQL + JWT sync.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { computeGoal, purchaseDailyBurn } from "@/lib/ahead/goalMath";
import { getPastData } from "@/lib/api/pastClient";
import { startTokenRefreshLoop } from "@/lib/auth/refreshClient";
import { computeBenchmark } from "@/lib/benchmark/computeBenchmark";
import { inferCityTier, inferIncomeBracket, parseBankCsv } from "@/lib/csv/parseBankCsv";
import { PERSONAS, getPersona, type PersonaSeed } from "@/lib/data/personas";
import { features } from "@/lib/features";
import type { CurrencyCode } from "@/lib/format/currency";
import {
  clearContextStorage,
  loadContextFromStorage,
  saveContextToStorage,
} from "@/lib/storage/contextStorage";
import type { FinancialContext } from "@/types/financialContext";

export { computeGoal, purchaseDailyBurn };

type DecideVerdict = NonNullable<FinancialContext["last_decide_verdict"]>;

export interface AuthUser {
  id: string;
  email: string;
}

export interface CsvUploadMeta {
  rowCount: number;
  skippedRows: number;
  detectedFormat: string;
  warnings: string[];
  duplicatesRemoved?: number;
}

interface FinancialContextValue {
  personas: PersonaSeed[];
  activeId: string | null;
  ctx: FinancialContext | null;
  pastLoading: boolean;
  pastError: string | null;
  fullStackEnabled: boolean;
  authUser: AuthUser | null;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  selectPersona: (sessionId: string) => Promise<void>;
  setGoal: (targetAmount: number, targetDate: string) => void;
  applyDecideVerdict: (verdict: DecideVerdict) => void;
  uploadCsv: (file: File, monthlyIncome: number, cityTier: string) => Promise<CsvUploadMeta>;
  logout: () => Promise<void>;
}

const Ctx = createContext<FinancialContextValue | null>(null);

function baseContext(seed: PersonaSeed): FinancialContext {
  return {
    session_id: seed.session_id,
    persona: seed.persona,
    monthly_income: seed.monthly_income,
    archetype: null,
    burn_rate: null,
    transactions: seed.transactions,
    goal: null,
    last_decide_verdict: null,
    benchmark: null,
  };
}

async function persistContext(patch: {
  goal?: FinancialContext["goal"];
  last_decide_verdict?: FinancialContext["last_decide_verdict"];
  burn_rate?: FinancialContext["burn_rate"];
}) {
  await fetch("/api/context", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
}

export function FinancialContextProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<FinancialContext | null>(null);
  const [pastLoading, setPastLoading] = useState(false);
  const [pastError, setPastError] = useState<string | null>(null);
  const [fullStackEnabled, setFullStackEnabled] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("INR");

  useEffect(() => {
    if (features.browserStorage) {
      const stored = loadContextFromStorage();
      if (stored) {
        setCtx(stored);
        setActiveId(stored.session_id);
      }
    }
    const savedCurrency = localStorage.getItem("fore_currency") as CurrencyCode | null;
    if (savedCurrency === "INR" || savedCurrency === "USD" || savedCurrency === "EUR") {
      setCurrency(savedCurrency);
    }
  }, []);

  useEffect(() => {
    if (ctx && features.browserStorage && !fullStackEnabled) {
      saveContextToStorage(ctx);
    }
  }, [ctx, fullStackEnabled]);

  useEffect(() => {
    localStorage.setItem("fore_currency", currency);
  }, [currency]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (r) => {
        const text = await r.text();
        if (!text.trim()) return null;
        try {
          return JSON.parse(text) as {
            database?: boolean;
            authenticated?: boolean;
            user?: AuthUser;
            context?: FinancialContext;
          };
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (!data) return;
        setFullStackEnabled(!!data.database);
        if (data.authenticated && data.user) {
          setAuthUser(data.user);
          if (data.context) {
            setCtx(data.context);
            setActiveId(data.context.session_id);
          }
        }
      })
      .catch((err) => {
        console.warn("Auth check failed:", err);
      });
  }, []);

  useEffect(() => {
    if (!fullStackEnabled || !authUser) return;
    return startTokenRefreshLoop(true);
  }, [fullStackEnabled, authUser]);

  const loadClientPersona = useCallback(async (sessionId: string, seed: PersonaSeed) => {
    const base = baseContext(seed);
    setActiveId(sessionId);
    setCtx(base);
    setPastError(null);
    setPastLoading(true);
    try {
      const past = await getPastData(seed.transactions, seed.monthly_income);
      const benchmark = computeBenchmark(
        seed.transactions,
        seed.income_bracket,
        seed.city_tier
      );
      setCtx((prev) =>
        prev && prev.session_id === sessionId
          ? { ...prev, archetype: past.archetype, burn_rate: past.burn_rate, benchmark }
          : prev
      );
    } catch (err) {
      setPastError(err instanceof Error ? err.message : "Failed to load PAST data");
    } finally {
      setPastLoading(false);
    }
  }, []);

  const selectPersona = useCallback(
    async (sessionId: string) => {
      const seed = getPersona(sessionId);
      if (!seed) return;

      if (fullStackEnabled && authUser) {
        setPastLoading(true);
        setPastError(null);
        try {
          const res = await fetch("/api/context/demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ personaId: sessionId }),
          });
          const text = await res.text();
          const data = text.trim() ? (JSON.parse(text) as { error?: string; context?: FinancialContext }) : {};
          if (!res.ok) throw new Error(data.error || "Failed to load persona");
          if (!data.context) throw new Error("Persona loaded but context was empty");
          setCtx(data.context);
          setActiveId(data.context.session_id);
        } catch (err) {
          setPastError(err instanceof Error ? err.message : "Failed to load persona");
        } finally {
          setPastLoading(false);
        }
        return;
      }

      await loadClientPersona(sessionId, seed);
    },
    [authUser, fullStackEnabled, loadClientPersona]
  );

  const uploadCsv = useCallback(
    async (file: File, monthlyIncome: number, cityTier: string): Promise<CsvUploadMeta> => {
      if (!fullStackEnabled || !authUser) {
        setPastLoading(true);
        setPastError(null);
        try {
          const text = await file.text();
          const parsed = parseBankCsv(text);
          const sessionId = `csv-upload-${Date.now()}`;
          const base: FinancialContext = {
            session_id: sessionId,
            persona: "Your CSV upload",
            monthly_income: monthlyIncome,
            archetype: null,
            burn_rate: null,
            transactions: parsed.transactions,
            goal: null,
            last_decide_verdict: null,
            benchmark: null,
          };
          setActiveId(sessionId);
          setCtx(base);
          const past = await getPastData(parsed.transactions, monthlyIncome);
          const benchmark = computeBenchmark(
            parsed.transactions,
            inferIncomeBracket(monthlyIncome),
            inferCityTier(cityTier)
          );
          setCtx((prev) =>
            prev && prev.session_id === sessionId
              ? { ...prev, archetype: past.archetype, burn_rate: past.burn_rate, benchmark }
              : prev
          );
          return {
            rowCount: parsed.rowCount,
            skippedRows: parsed.skippedRows,
            detectedFormat: parsed.detectedFormat,
            warnings: parsed.warnings,
            duplicatesRemoved: parsed.duplicatesRemoved,
          };
        } catch (err) {
          setPastError(err instanceof Error ? err.message : "CSV analysis failed");
          throw err;
        } finally {
          setPastLoading(false);
        }
      }

      const form = new FormData();
      form.append("file", file);
      form.append("monthlyIncome", String(monthlyIncome));
      form.append("cityTier", cityTier);
      setPastLoading(true);
      setPastError(null);
      try {
        const res = await fetch("/api/upload/csv", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const text = await res.text();
        let data: { error?: string; context?: FinancialContext; meta?: CsvUploadMeta } = {};
        if (text.trim()) {
          try {
            data = JSON.parse(text) as typeof data;
          } catch {
            throw new Error(
              res.ok
                ? "Upload returned invalid JSON"
                : `Upload failed (${res.status})`
            );
          }
        } else if (!res.ok) {
          throw new Error(`Upload failed (${res.status})`);
        }
        if (!res.ok) throw new Error(data.error || "Upload failed");
        if (!data.context) throw new Error("Upload succeeded but no context returned");
        setCtx(data.context);
        setActiveId(data.context.session_id);
        return data.meta as CsvUploadMeta;
      } finally {
        setPastLoading(false);
      }
    },
    [authUser, fullStackEnabled]
  );

  const setGoal = useCallback(
    (targetAmount: number, targetDate: string) => {
      setCtx((prev) => {
        if (!prev) return prev;
        const dailyAvg = prev.burn_rate?.daily_avg ?? 0;
        const goal = computeGoal(targetAmount, targetDate, prev.monthly_income, dailyAvg);
        if (fullStackEnabled && authUser) {
          void persistContext({ goal });
        }
        return { ...prev, goal };
      });
    },
    [authUser, fullStackEnabled]
  );

  const applyDecideVerdict = useCallback(
    (verdict: DecideVerdict) => {
      setCtx((prev) => {
        if (!prev) return prev;
        const stored: DecideVerdict = {
          item: verdict.item,
          amount: verdict.amount,
          day_shift: verdict.day_shift,
          new_zero_balance_date: verdict.new_zero_balance_date,
        };
        const burn_rate = prev.burn_rate
          ? { ...prev.burn_rate, projected_zero_balance_date: verdict.new_zero_balance_date }
          : prev.burn_rate;

        let goal = prev.goal;
        if (goal && prev.burn_rate) {
          const adjustedDailyAvg = prev.burn_rate.daily_avg + purchaseDailyBurn(verdict.amount);
          goal = computeGoal(
            goal.target_amount,
            goal.target_date,
            prev.monthly_income,
            adjustedDailyAvg
          );
        }

        if (fullStackEnabled && authUser) {
          void persistContext({
            last_decide_verdict: stored,
            burn_rate: burn_rate ?? undefined,
            goal: goal ?? undefined,
          });
        }

        return { ...prev, last_decide_verdict: stored, burn_rate, goal };
      });
    },
    [authUser, fullStackEnabled]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuthUser(null);
    setCtx(null);
    setActiveId(null);
    if (features.browserStorage) clearContextStorage();
  }, []);

  const value = useMemo<FinancialContextValue>(
    () => ({
      personas: PERSONAS,
      activeId,
      ctx,
      pastLoading,
      pastError,
      fullStackEnabled,
      authUser,
      currency,
      setCurrency,
      selectPersona,
      setGoal,
      applyDecideVerdict,
      uploadCsv,
      logout,
    }),
    [
      activeId,
      ctx,
      pastLoading,
      pastError,
      fullStackEnabled,
      authUser,
      currency,
      selectPersona,
      setGoal,
      applyDecideVerdict,
      uploadCsv,
      logout,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinancialContext(): FinancialContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFinancialContext must be used within FinancialContextProvider");
  return v;
}
