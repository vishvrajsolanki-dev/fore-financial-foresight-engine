"use client";

import { useRef, useState, type DragEvent } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

/** Clean statement upload — product copy only (no ML jargon). */
export default function CsvUploadPanel({ compact = false }: { compact?: boolean }) {
  const { fullStackEnabled, authUser, uploadCsv, pastLoading, loadSampleStatement } =
    useFinancialContext();
  const [income, setIncome] = useState("60000");
  const [cityTier, setCityTier] = useState("Tier 2");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const demoMode = !fullStackEnabled || !authUser;

  async function analyse(file: File) {
    setError(null);
    setSuccess(null);
    const monthlyIncome = Number(income);
    if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
      setError("Enter a valid monthly income first.");
      return;
    }
    try {
      const meta = await uploadCsv(file, monthlyIncome, cityTier);
      setSuccess(`Imported ${meta.rowCount} transactions.`);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void analyse(file);
  }

  return (
    <div className="card rise-in">
      <p className="font-semibold">{compact ? "Replace statement" : "Upload bank statement"}</p>
      <p className="muted mt-1 text-sm">
        Drop a CSV export. We assign your spending profile from the patterns in the file.
        {demoMode
          ? " Demo mode analyses in your browser."
          : " Descriptions are encrypted at rest."}
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop your CSV here or click to browse"
        className="mt-4 rounded-xl border-2 border-dashed px-6 py-8 text-center"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          background: dragOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--input-bg)",
          cursor: pastLoading ? "wait" : "pointer",
        }}
        onClick={() => !pastLoading && fileRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !pastLoading) fileRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!pastLoading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          className="hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void analyse(file);
          }}
        />
        <p className="text-sm font-semibold">{pastLoading ? "Analysing…" : "Drag & drop CSV"}</p>
        <p className="muted mt-1 text-xs">or click to browse · HDFC, ICICI, SBI, Kotak</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="muted text-xs">Monthly income (₹)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
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
      </div>

      {!compact && (
        <div className="mt-4">
          <button
            type="button"
            className="btn-ghost btn text-sm"
            disabled={pastLoading}
            onClick={async () => {
              setError(null);
              try {
                await loadSampleStatement();
                setSuccess("Demo statement loaded.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not load sample");
              }
            }}
          >
            Use demo data instead
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm" style={{ color: "var(--positive)" }}>
          {success}
        </p>
      )}
    </div>
  );
}
