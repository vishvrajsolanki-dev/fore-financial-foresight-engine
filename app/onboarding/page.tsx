"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

/**
 * O3 single-focus + U3 equal Upload / Demo choices.
 * Clean product copy — no Euclidean/ML jargon.
 */
export default function OnboardingPage() {
  const { loadSampleStatement, uploadCsv, pastLoading, activeId } = useFinancialContext();
  // Skip sparse welcome — go straight to equal Upload / Demo (U3)
  const [step, setStep] = useState<"choose" | "done">(activeId ? "done" : "choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState("60000");
  const [cityTier, setCityTier] = useState("Tier 2");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function tryDemo() {
    setBusy(true);
    setError(null);
    try {
      await loadSampleStatement();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load demo");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const monthlyIncome = Number(income);
      if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
        throw new Error("Enter a valid monthly income");
      }
      await uploadCsv(file, monthlyIncome, cityTier);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="fore-brand text-xl">
          F<span style={{ color: "var(--accent)" }}>O</span>RE
        </Link>

        {step === "choose" && (
          <div className="mt-12 rise-in">
            <h1 className="display text-3xl mb-2">How do you want to start?</h1>
            <p className="muted mb-8">Upload a bank CSV or try demo data — same product either way.</p>

            <div className="grid md:grid-cols-2 gap-6 items-stretch">
              <div className="card flex flex-col">
                <h2 className="display text-xl">Upload bank CSV</h2>
                <p className="muted text-sm mt-2 mb-4">
                  Import a statement. We read your spend patterns and assign your profile.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <label className="grid gap-1 text-xs muted">
                    Monthly income (₹)
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-xs muted">
                    City tier
                    <select className="input" value={cityTier} onChange={(e) => setCityTier(e.target.value)}>
                      <option>Tier 1</option>
                      <option>Tier 2</option>
                      <option>Tier 3</option>
                    </select>
                  </label>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className="rounded-xl border-2 border-dashed px-4 py-10 text-center flex-1"
                  style={{
                    borderColor: dragOver ? "var(--accent)" : "var(--border)",
                    background: dragOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--input-bg)",
                    cursor: busy || pastLoading ? "wait" : "pointer",
                  }}
                  onClick={() => !(busy || pastLoading) && fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onFile(f);
                    }}
                  />
                  <p className="font-semibold text-sm">
                    {busy || pastLoading ? "Analysing…" : "Drop CSV here"}
                  </p>
                  <p className="muted text-xs mt-1">HDFC · ICICI · SBI · Kotak exports</p>
                </div>
              </div>

              <div className="card flex flex-col">
                <h2 className="display text-xl">Try demo data</h2>
                <p className="muted text-sm mt-2 mb-4">
                  Load a sample ledger and explore Past, Decide, and Ahead immediately.
                </p>
                <div className="flex-1" />
                <button className="btn w-full" type="button" disabled={busy || pastLoading} onClick={tryDemo}>
                  {busy || pastLoading ? "Loading…" : "Use demo data"}
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="mt-16 rise-in text-center max-w-lg mx-auto">
            <div className="state-illustration" aria-hidden />
            <h1 className="display text-3xl">You&apos;re ready</h1>
            <p className="muted mt-3">Your foresight faces are ready — start with Past.</p>
            <div className="flex justify-center gap-3 mt-8">
              <a className="btn" href="/past">
                Open Past
              </a>
              <a className="btn-ghost btn" href="/decide">
                Ask Decide
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
