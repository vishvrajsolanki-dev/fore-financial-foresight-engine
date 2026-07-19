"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/components/AuthNav";
import FeatureToolbar from "@/components/FeatureToolbar";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const TABS = [
  { href: "/past", label: "PAST", hint: "Who you are" },
  { href: "/decide", label: "DECIDE", hint: "Can I afford it?" },
  { href: "/ahead", label: "AHEAD", hint: "Where you're headed" },
];

export default function FacesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeId, ctx, fullStackEnabled, authUser, currency, setCurrency } = useFinancialContext();
  const assigned = ctx?.archetype?.label;

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
            {fullStackEnabled && (
              <Link href="/settings" className="btn-ghost text-xs px-3 py-1.5">
                Settings
              </Link>
            )}
            <AuthNav />
          </div>
        </div>

        <div className="app-toolbar-row">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="muted text-xs font-semibold uppercase tracking-wide shrink-0">
              Assigned profile
            </span>
            {assigned ? (
              <>
                <span className="pill pill-success">{assigned}</span>
                <span className="muted text-xs hidden sm:inline">
                  from your spending mix · not selected
                </span>
              </>
            ) : (
              <span className="muted text-sm">
                Upload a bank CSV on PAST — we assign one of 5 archetypes
              </span>
            )}
          </div>
          {ctx?.persona && ctx.persona !== assigned && (
            <span className="pill truncate max-w-[14rem]">{ctx.persona}</span>
          )}
        </div>
      </header>

      <main className="app-main">
        {!activeId && pathname !== "/past" ? (
          <div className="card rise-in py-12 text-center">
            <p className="text-lg font-semibold">Upload your statement to continue</p>
            <p className="muted mt-2 max-w-md mx-auto text-sm">
              Your archetype is assigned from spending patterns (nearest of 5 centroids) — same idea
              as RupeeIQ. Start on{" "}
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
          {assigned ? `${assigned} · ` : ""}
          {!authUser && fullStackEnabled ? "Signed out · " : ""}
          Not licensed financial advice — hackathon demo only.
        </p>
      </footer>
    </div>
  );
}
