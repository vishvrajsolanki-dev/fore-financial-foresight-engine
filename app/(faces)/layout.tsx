"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, MessageSquareText, TrendingUp, Settings } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import FeatureToolbar from "@/components/FeatureToolbar";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const TABS = [
  { href: "/past", label: "PAST", hint: "Decoded spend", icon: CalendarRange },
  { href: "/decide", label: "DECIDE", hint: "Can I afford it?", icon: MessageSquareText },
  { href: "/ahead", label: "AHEAD", hint: "Pace & peers", icon: TrendingUp },
];

export default function FacesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeId, ctx, fullStackEnabled, authUser, currency, setCurrency } = useFinancialContext();
  const assigned = ctx?.archetype?.label;

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary">
        <Link href="/past" className="fore-brand text-2xl px-2">
          F<span style={{ color: "var(--accent)" }}>O</span>RE
        </Link>
        <p className="muted text-xs px-2 leading-relaxed">
          Spend patterns assign your profile — you never pick a persona.
        </p>
        <nav className="flex flex-col gap-1 mt-2" aria-label="FORE faces">
          {TABS.map((t) => {
            const active = pathname === t.href;
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`app-nav-link ${active ? "app-nav-link-active" : ""}`}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                <span className="flex flex-col">
                  <span>{t.label}</span>
                  <span className="text-[0.65rem] font-medium opacity-70">{t.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-1">
          {fullStackEnabled && (
            <Link href="/settings" className="app-nav-link">
              <Settings size={18} strokeWidth={1.75} aria-hidden />
              Settings
            </Link>
          )}
          <AuthNav />
        </div>
      </aside>

      <div className="app-content">
        <header className="app-contextbar">
          <Link href="/past" className="fore-brand text-xl sm:hidden">
            F<span style={{ color: "var(--accent)" }}>O</span>RE
          </Link>
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <span className="muted text-xs font-semibold uppercase tracking-wide">Assigned</span>
            {assigned ? (
              <span className="pill pill-success">{assigned}</span>
            ) : (
              <span className="muted text-sm">Upload a CSV on PAST</span>
            )}
          </div>
          <FeatureToolbar currency={currency} onCurrencyChange={setCurrency} />
          <div className="sm:hidden">
            <AuthNav />
          </div>
        </header>

        <main id="main" className="app-main">
          {!activeId && pathname !== "/past" ? (
            <div className="card rise-in py-12 text-center">
              <p className="display text-2xl">Upload your statement to continue</p>
              <p className="muted mt-2 max-w-md mx-auto text-sm">
                Your archetype is assigned from spending patterns. Start on{" "}
                <Link href="/past" className="underline" style={{ color: "var(--accent)" }}>
                  PAST
                </Link>
                .
              </p>
            </div>
          ) : (
            <div key={pathname} className="stagger grid gap-4">
              {children}
            </div>
          )}
        </main>

        <footer className="app-footer">
          {assigned ? `${assigned} · ` : ""}
          {!authUser && fullStackEnabled ? "Signed out · " : ""}
          Not licensed financial advice — hackathon demo only.
        </footer>
      </div>

      <nav className="mobile-tabbar" aria-label="Mobile faces">
        {TABS.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`mobile-tab ${active ? "mobile-tab-active" : ""}`}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
