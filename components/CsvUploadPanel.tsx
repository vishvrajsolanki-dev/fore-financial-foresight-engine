"use client";

import { useState } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function CsvUploadPanel() {
  const { fullStackEnabled, authUser, uploadCsv, pastLoading } = useFinancialContext();
  const [income, setIncome] = useState("60000");
  const [cityTier, setCityTier] = useState("Tier 2");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!fullStackEnabled || !authUser) return null;

  return (
    <div className="card mt-4">
      <p className="muted text-sm">Real bank data</p>
      <p className="mt-1 font-semibold">Upload your bank statement CSV</p>
      <p className="muted mt-1 text-sm">
        Supports HDFC, ICICI, SBI-style exports (Date, Narration, Debit/Credit columns). Raw CSV
        is never stored — only normalized transactions with encrypted descriptions.
      </p>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSuccess(null);
          const form = e.currentTarget;
          const fileInput = form.elements.namedItem("csvfile") as HTMLInputElement;
          const file = fileInput.files?.[0];
          if (!file) {
            setError("Choose a CSV file first.");
            return;
          }
          const monthlyIncome = Number(income);
          if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
            setError("Enter a valid monthly income.");
            return;
          }
          try {
            const meta = await uploadCsv(file, monthlyIncome, cityTier);
            setSuccess(
              `Imported ${meta.rowCount} transactions (${meta.detectedFormat}).` +
                (meta.warnings.length ? ` Note: ${meta.warnings[0]}` : "")
            );
            fileInput.value = "";
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          }
        }}
      >
        <label className="grid gap-1 sm:col-span-2">
          <span className="muted text-xs">CSV file (max 5 MB)</span>
          <input className="input" type="file" name="csvfile" accept=".csv,text/csv" required />
        </label>
        <label className="grid gap-1">
          <span className="muted text-xs">Monthly income (₹)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="muted text-xs">City tier</span>
          <select className="input" value={cityTier} onChange={(e) => setCityTier(e.target.value)}>
            <option>Tier 1</option>
            <option>Tier 2</option>
            <option>Tier 3</option>
          </select>
        </label>
        <button className="btn sm:col-span-2" type="submit" disabled={pastLoading}>
          {pastLoading ? "Processing…" : "Upload & analyse"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm" style={{ color: "var(--accent-2)" }}>
          {success}
        </p>
      )}
    </div>
  );
}
