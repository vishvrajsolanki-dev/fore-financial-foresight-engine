"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CsvUploadPanel from "@/components/CsvUploadPanel";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { loadSampleStatement, activeId } = useFinancialContext();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"welcome" | "choose" | "done">(activeId ? "done" : "welcome");

  async function tryDemo() {
    setBusy(true);
    try {
      await loadSampleStatement();
      setStep("done");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="fore-brand text-xl">
          F<span style={{ color: "var(--accent)" }}>O</span>RE
        </Link>

        {step === "welcome" && (
          <div className="mt-16 rise-in">
            <h1 className="display text-4xl sm:text-5xl">Welcome to foresight</h1>
            <p className="muted mt-4 max-w-lg text-lg">
              One step at a time. Add a bank CSV — or explore with demo data.
            </p>
            <button className="btn mt-8" onClick={() => setStep("choose")}>
              Continue
            </button>
          </div>
        )}

        {step === "choose" && (
          <div className="mt-12 rise-in">
            <h1 className="display text-3xl mb-8">How do you want to start?</h1>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="display text-xl">Upload bank CSV</h2>
                <p className="muted text-sm mt-2 mb-4">Import your statement. We assign your archetype from patterns.</p>
                <CsvUploadPanel />
              </div>
              <div className="card flex flex-col">
                <h2 className="display text-xl">Try demo data</h2>
                <p className="muted text-sm mt-2 mb-4">Equal weight path — load a sample ledger and explore immediately.</p>
                <button className="btn mt-auto" disabled={busy} onClick={tryDemo}>
                  {busy ? "Loading…" : "Use demo data"}
                </button>
              </div>
            </div>
            {activeId && (
              <button className="btn mt-6" onClick={() => setStep("done")}>
                Continue
              </button>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="mt-16 rise-in text-center">
            <div className="state-illustration" aria-hidden />
            <h1 className="display text-3xl">You&apos;re ready</h1>
            <p className="muted mt-3">Your pulse is waiting on Home. Or jump into Past.</p>
            <div className="flex justify-center gap-3 mt-8">
              <button className="btn" onClick={() => router.push("/home")}>
                Go to Home
              </button>
              <button className="btn-ghost btn" onClick={() => router.push("/past")}>
                Open Past
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
