// FORE — app/(faces)/layout.tsx
// Owner: TASK-002 (Drashti). 3-tab nav shell shared by PAST / DECIDE / AHEAD, plus the demo
// persona switcher (so PAST/DECIDE/AHEAD all operate on one selected financial_context).
// Consumed by: TASK-006 (shares this layout).
// TASK-010: disclaimer visible on every face + nav/mobile consistency polish.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/components/AuthNav";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const TABS = [
  { href: "/past", label: "PAST", hint: "Who you are" },
  { href: "/decide", label: "DECIDE", hint: "Can I afford it?" },
  { href: "/ahead", label: "AHEAD", hint: "Where you're headed" },
];

const DISCLAIMER =
  "Not licensed financial advice — FORE is a hackathon demo, not a licensed advisory product.";

export default function FacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { personas, activeId, ctx, selectPersona, fullStackEnabled, authUser } = useFinancialContext();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              FORE{" "}
              <span className="muted font-normal">· Financial Foresight Engine</span>
            </h1>
            <p className="muted mt-1 text-sm">
              One financial context, three linked views — the model runs real math, never a
              guess.
            </p>
          </div>
          <AuthNav />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="persona" className="muted text-sm whitespace-nowrap">
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

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="FORE faces">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-xl border px-3 py-2 transition-colors sm:px-4 ${
                  active
                    ? "border-transparent bg-[var(--accent)] text-white"
                    : "border-[var(--border)] hover:bg-[var(--bg-soft)]"
                }`}
              >
                <span className="font-semibold">{t.label}</span>
                <span
                  className={`ml-2 hidden text-xs sm:inline ${
                    active ? "text-white/80" : "muted"
                  }`}
                >
                  {t.hint}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Visible on every face without scrolling — TASK-010 deliverable. */}
        <p className="disclaimer mt-4" role="note">
          {DISCLAIMER}
        </p>
      </header>

      <main className="flex-1">
        {/* PAST always renders — it hosts the CSV upload, which is how a fresh
            session gets its financial context in the first place. */}
        {!activeId && pathname !== "/past" ? (
          <div className="card rise-in py-12 text-center">
            <p className="text-lg font-medium">No financial context yet</p>
            <p className="muted mt-1">
              Upload your bank CSV on PAST, or select a demo persona above.
              {!fullStackEnabled &&
                " Each persona has ~120 real-shaped transactions across 3 months."}
            </p>
          </div>
        ) : (
          <div key={pathname} className="rise-in">
            {children}
          </div>
        )}
      </main>

      <footer className="mt-10 border-t border-[var(--border)] pt-4 pb-2">
        <p className="muted text-xs">
          {ctx?.persona ? `Active context: ${ctx.persona}. ` : ""}
          {DISCLAIMER}
        </p>
      </footer>
    </div>
  );
}
