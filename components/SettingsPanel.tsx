"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

type ConsentState = {
  csvUploadAt: string | null;
  aiProcessingAt: string | null;
  benchmarkOptInAt: string | null;
  privacyAcceptedAt: string | null;
};

export default function SettingsPanel() {
  const { fullStackEnabled, authUser, logout } = useFinancialContext();
  const router = useRouter();
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!fullStackEnabled || !authUser) return;
    fetch("/api/account/consent", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setConsent(d.consent))
      .catch(() => {});
  }, [fullStackEnabled, authUser]);

  async function saveConsent(patch: {
    privacyAccepted?: boolean;
    benchmarkOptIn?: boolean;
    aiProcessing?: boolean;
  }) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/account/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConsent(data.consent);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/export", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fore-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus("Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account and all data? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      await logout();
      router.push("/login");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  if (!fullStackEnabled) {
    return (
      <div className="card">
        <p className="font-medium">Settings</p>
        <p className="muted text-sm mt-2">
          Full-stack mode is off (no DATABASE_URL).{" "}
          <Link href="/login" className="underline" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>{" "}
          when the database is configured.
        </p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="card">
        <p className="font-medium">Settings</p>
        <p className="muted text-sm mt-2">
          <Link href="/login" className="underline" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>{" "}
          to manage consent, export, or delete your data.
        </p>
      </div>
    );
  }

  return (
    <div className="card grid gap-4">
      <div>
        <p className="font-medium">Privacy & consent</p>
        <p className="muted text-sm mt-1">Logged in as {authUser.email}</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!consent?.privacyAcceptedAt}
          onChange={(e) => e.target.checked && void saveConsent({ privacyAccepted: true })}
          disabled={busy || !!consent?.privacyAcceptedAt}
        />
        <span>I accept the privacy policy for CSV upload and AI processing.</span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!consent?.aiProcessingAt}
          onChange={(e) => e.target.checked && void saveConsent({ aiProcessing: true })}
          disabled={busy || !!consent?.aiProcessingAt}
        />
        <span>Allow AI tools to process my spending summaries (no descriptions by default).</span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!consent?.benchmarkOptInAt}
          onChange={(e) => void saveConsent({ benchmarkOptIn: e.target.checked })}
          disabled={busy}
        />
        <span>Opt in to anonymized benchmark contribution (category totals only).</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-sm" onClick={() => void exportData()} disabled={busy}>
          Export my data
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          style={{ color: "var(--danger)" }}
          onClick={() => void deleteAccount()}
          disabled={busy}
        >
          Delete account
        </button>
      </div>

      {status && <p className="muted text-xs">{status}</p>}
    </div>
  );
}
