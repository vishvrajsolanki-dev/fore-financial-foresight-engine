// FORE — app/(faces)/layout.tsx
// Owner: TASK-002 (Drashti). 3-tab nav shell shared by PAST / DECIDE / AHEAD, plus the demo
// persona switcher (so PAST/DECIDE/AHEAD all operate on one selected financial_context).
// Consumed by: TASK-006 (shares this layout).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const TABS = [
  { href: "/past", label: "PAST", hint: "Who you are" },
  { href: "/decide", label: "DECIDE", hint: "Can I afford it?" },
  { href: "/ahead", label: "AHEAD", hint: "Where you're headed" },
];

export default function FacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { personas, activeId, ctx, selectPersona } = useFinancialContext();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              FORE <span className="muted font-normal">· Financial Foresight Engine</span>
            </h1>
            <p className="muted text-sm mt-1">
              One financial context, three linked views — the model runs real math, never a guess.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="persona" className="muted text-sm">
              Demo persona
            </label>
            <select
              id="persona"
              className="input max-w-[16rem]"
              value={activeId ?? ""}
              onChange={(e) => selectPersona(e.target.value)}
            >
              <option value="" disabled>
                Select a persona…
              </option>
              {personas.map((p) => (
                <option key={p.session_id} value={p.session_id}>
                  {p.persona}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="mt-5 flex gap-2">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-xl px-4 py-2 border transition-colors ${
                  active
                    ? "border-transparent bg-[var(--accent)] text-white"
                    : "border-[var(--border)] hover:bg-[var(--bg-soft)]"
                }`}
              >
                <span className="font-semibold">{t.label}</span>
                <span className={`ml-2 text-xs ${active ? "text-white/80" : "muted"}`}>
                  {t.hint}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main>
        {!activeId ? (
          <div className="card text-center py-12">
            <p className="text-lg font-medium">Select a demo persona to begin</p>
            <p className="muted mt-1">
              Each persona has ~120 real-shaped transactions across 3 months.
            </p>
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="mt-10 border-t border-[var(--border)] pt-4">
        <p className="muted text-xs">
          {ctx?.persona ? `Active context: ${ctx.persona}. ` : ""}
          Not licensed financial advice — demo/hackathon build.
        </p>
      </footer>
    </div>
  );
}
