// FORE — components/ShellNav.tsx
// Owner: TASK-002 (Drashti). Header with the 3-tab nav (PAST / DECIDE / AHEAD) and the demo
// persona selector. Selecting a persona seeds the shared financial_context (CONTRACT-001).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinancialContext } from "@/lib/context/financialContext";

const TABS = [
  { href: "/past", label: "PAST" },
  { href: "/decide", label: "DECIDE" },
  { href: "/ahead", label: "AHEAD" },
];

export default function ShellNav() {
  const pathname = usePathname();
  const { activePersona, personas, selectPersona } = useFinancialContext();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/past" className="text-lg font-bold tracking-wide">
          <span className="text-emerald-400">FORE</span>
          <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline">
            Financial Foresight Engine
          </span>
        </Link>

        <nav className="order-last flex w-full gap-1 sm:order-none sm:ml-6 sm:w-auto">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors " +
                  (active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="persona-select" className="text-xs text-slate-400">
            Persona
          </label>
          <select
            id="persona-select"
            value={activePersona?.persona ?? ""}
            onChange={(e) => selectPersona(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">— select —</option>
            {personas.map((p) => (
              <option key={p.persona} value={p.persona}>
                {p.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
