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

const DISCLAIMER =
  "Not licensed financial advice — FORE is a hackathon demo, not a licensed advisory product.";

export default function FacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { personas, activeId, ctx, selectPersona, fullStackEnabled, authUser, currency, setCurrency } =
    useFinancialContext();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:py-10">
      <header className="app-header rise-in mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="fore-brand text-2xl sm:text-3xl">
              F<span style={{ color: "var(--accent)" }}>O</span>RE
            </p>
            <p className="muted mt-1 max-w-md text-sm leading-relaxed">
              One platform, three linked faces on a shared data spine — your past decoded,
              decisions grounded, goals paced.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AuthNav />
            <FeatureToolbar currency={currency} onCurrencyChange={setCurrency} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
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
          {ctx?.persona && (
            <span className="pill hidden sm:inline-flex">{ctx.persona}</span>
          )}
        </div>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="FORE faces">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`face-tab ${active ? "face-tab-active" : ""}`}
              >
                <span>{t.label}</span>
                <span className={`face-tab-hint ml-2 hidden text-xs sm:inline ${active ? "" : "muted"}`}>
                  {t.hint}
                </span>
              </Link>
            );
          })}
        </nav>

        <PersonaCompare />

        <p className="disclaimer mt-4" role="note">
          {DISCLAIMER}
        </p>
      </header>

      <main className="flex-1">
        {!activeId && pathname !== "/past" ? (
          <div className="card rise-in py-12 text-center">
            <p className="text-lg font-medium">No financial context yet</p>
            <p className="muted mt-1">
              Upload your bank CSV on{" "}
              <Link href="/past" className="underline" style={{ color: "var(--accent)" }}>
                PAST
              </Link>
              , or select a demo persona above.
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
          {!authUser && fullStackEnabled && "Browsing in demo mode — "}
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          for saved sessions.
        </p>
      </footer>
    </div>
  );
}
