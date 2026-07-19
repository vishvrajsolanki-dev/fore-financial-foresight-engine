"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  MessageSquareText,
  TrendingUp,
  Home,
  Lightbulb,
  FileBarChart,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import AuthNav from "@/components/AuthNav";
import FeatureToolbar from "@/components/FeatureToolbar";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

const PRIMARY = [
  { href: "/home", label: "Home", hint: "Pulse", icon: Home },
  { href: "/past", label: "Past", hint: "Who you are", icon: CalendarRange },
  { href: "/decide", label: "Decide", hint: "Can I afford it?", icon: MessageSquareText },
  { href: "/ahead", label: "Ahead", hint: "Goals & peers", icon: TrendingUp },
];

const SECONDARY = [
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeId, ctx, fullStackEnabled, authUser, currency, setCurrency } = useFinancialContext();
  const assigned = ctx?.archetype?.label;
  const needsData = !activeId && !pathname.startsWith("/past") && !pathname.startsWith("/onboarding") && pathname !== "/home";

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary">
        <Link href="/home" className="fore-brand text-2xl px-2">
          F<span style={{ color: "var(--accent)" }}>O</span>RE
        </Link>
        <p className="muted text-xs px-2 leading-relaxed">Financial foresight engine</p>

        <nav className="flex flex-col gap-1 mt-2" aria-label="Primary">
          {PRIMARY.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");
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

        <nav className="flex flex-col gap-1 mt-4" aria-label="Secondary">
          {SECONDARY.map((t) => {
            const active = pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`app-nav-link ${active ? "app-nav-link-active" : ""}`}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 px-1">
          <Link
            href="/settings"
            className={`app-nav-link ${pathname.startsWith("/settings") ? "app-nav-link-active" : ""}`}
          >
            <Settings size={18} strokeWidth={1.75} aria-hidden />
            Settings
          </Link>
          <AuthNav />
        </div>
      </aside>

      <div className="app-content">
        <header className="app-contextbar">
          <Link href="/home" className="fore-brand text-xl sm:hidden">
            F<span style={{ color: "var(--accent)" }}>O</span>RE
          </Link>
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <span className="muted text-xs font-semibold uppercase tracking-wide">Assigned</span>
            {assigned ? (
              <span className="pill pill-success">{assigned}</span>
            ) : (
              <span className="muted text-sm">Upload or try demo data</span>
            )}
          </div>
          <FeatureToolbar currency={currency} onCurrencyChange={setCurrency} />
          <div className="sm:hidden">
            <AuthNav />
          </div>
        </header>

        <main id="main" className="app-main">
          {needsData ? (
            <div className="card rise-in py-12 text-center">
              <div className="state-illustration" aria-hidden />
              <p className="display text-2xl">Add your data to continue</p>
              <p className="muted mt-2 max-w-md mx-auto text-sm">
                Upload a bank CSV or try demo data in{" "}
                <Link href="/onboarding" className="underline" style={{ color: "var(--accent)" }}>
                  onboarding
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
          FORE · Light sidebar · Evening available in Settings
        </footer>
      </div>

      <nav className="mobile-tabbar" aria-label="Mobile">
        {[
          { href: "/past", label: "Past", icon: CalendarRange },
          { href: "/decide", label: "Decide", icon: MessageSquareText },
          { href: "/ahead", label: "Ahead", icon: TrendingUp },
          { href: "/settings", label: "More", icon: MoreHorizontal },
        ].map((t) => {
          const Icon = t.icon;
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-1 text-[0.65rem] font-semibold ${
                active ? "" : "muted"
              }`}
              style={active ? { color: "var(--accent)" } : undefined}
            >
              <Icon size={20} strokeWidth={1.75} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
