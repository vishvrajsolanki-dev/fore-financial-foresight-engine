"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/components/AuthNav";
import FeatureToolbar from "@/components/FeatureToolbar";
import PersonaCompare from "@/components/PersonaCompare";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const TABS = [
  { href: "/past", label: "PAST", hint: "Who you are" },
  { href: "/decide", label: "DECIDE", hint: "Can I afford it?" },
  { href: "/ahead", label: "AHEAD", hint: "Where you're headed" },
];

export default function FacesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { personas, activeId, ctx, selectPersona, fullStackEnabled, authUser, currency, setCurrency } =
    useFinancialContext();

  return (
    <div className="app-shell">
      <header className="app-topbar rise-in">
        <div className="app-topbar-row">
          <Link href="/past" className="fore-brand text-xl sm:text-2xl shrink-0">
            F<span className="text-[var(--accent)]">O</span>RE
          </Link>

          <nav className="app-tabs" aria-label="FORE faces">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`face-tab face-tab-compact ${active ? "face-tab-active" : ""}`}
                >
                  <span>{t.label}</span>
                  <span className={`face-tab-hint hidden md:inline ${active ? "" : "muted"}`}>
                    {t.hint}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="app-topbar-actions">
            <FeatureToolbar currency={currency} onCurrencyChange={setCurrency} />
            <AuthNav />
          </div>
        </div>

        <div className="app-toolbar-row">
          <div className="app-persona-group">
            <label htmlFor="persona" className="muted text-xs font-semibold uppercase tracking-wide">
              Persona
            </label>
            <select
              id="persona"
              className="input app-persona-select"
              value={activeId ?? ""}
              onChange={(e) => selectPersona(e.target.value)}
            >
              <option value="" disabled>
                Select…
              </option>
              {personas.map((p) => (
                <option key={p.session_id} value={p.session_id}>
                  {p.persona}
                </option>
              ))}
            </select>
          </div>
          {ctx?.persona && <span className="pill truncate max-w-[14rem]">{ctx.persona}</span>}
          {ctx?.archetype?.label && (
            <span className="pill pill-success hidden sm:inline-flex">{ctx.archetype.label}</span>
          )}
          <PersonaCompare />
        </div>
      </header>

      <main className="app-main">
        {!activeId && pathname !== "/past" ? (
          <div className="card rise-in py-12 text-center">
            <p className="text-lg font-semibold">Select a persona to continue</p>
            <p className="muted mt-2 max-w-md mx-auto text-sm">
              Choose a demo persona above, or upload your bank CSV on{" "}
              <Link href="/past" className="underline" style={{ color: "var(--accent)" }}>
                PAST
              </Link>
              .
            </p>
          </div>
        ) : (
          <div key={pathname} className="rise-in grid gap-4">
            {children}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p className="muted text-xs">
          {ctx?.persona ? `${ctx.persona} · ` : ""}
          {!authUser && fullStackEnabled ? "Demo mode · " : ""}
          Not licensed financial advice — hackathon demo only.
        </p>
      </footer>
    </div>
  );
}
