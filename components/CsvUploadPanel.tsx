"use client";

// FORE — components/CsvUploadPanel.tsx
// CSV entry point on PAST. Full-stack mode posts to /api/upload/csv (encrypted,
// persisted). Demo mode parses the file in the browser and runs the same ML calls
// the personas use — the sign-in → upload → dashboard flow works without a DB.

import { useRef, useState, type DragEvent } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function CsvUploadPanel() {
  const { fullStackEnabled, authUser, uploadCsv, pastLoading, activeId } = useFinancialContext();
  const [income, setIncome] = useState("60000");
  const [cityTier, setCityTier] = useState("Tier 2");
  const [fileName, setFileName] = useState<string | null>(null);
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
      setSuccess(
        `Imported ${meta.rowCount} transactions (${meta.detectedFormat}).` +
          (meta.warnings.length ? ` Note: ${meta.warnings[0]}` : "")
      );
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      void analyse(file);
    }
  }

  return (
    <div className={`card ${activeId ? "" : "rise-in"}`}>
      <p className="muted text-sm">{demoMode ? "Bring your statement" : "Real bank data"}</p>
      <p className="mt-1 font-semibold">Upload your bank statement CSV</p>
      <p className="muted mt-1 text-sm">
        Supports HDFC, ICICI, SBI, and Kotak exports (including Amount + Dr/Cr statements).{" "}
        {demoMode
          ? "Parsed in your browser — transactions are sent only to the analysis service, never stored."
          : "Raw CSV is never stored — only normalized transactions with encrypted descriptions."}
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop your CSV here or click to browse"
        className="mt-4 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          background: dragOver ? "rgba(222, 91, 50, 0.06)" : "transparent",
          transform: dragOver ? "scale(1.01)" : undefined,
          cursor: pastLoading ? "default" : "pointer",
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
          name="csvfile"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              void analyse(file);
            }
          }}
        />
        {pastLoading ? (
          <div className="rise-in">
            {fileName && <span className="pill">{fileName}</span>}
            <p className="mt-3 text-sm font-medium">Analysing your transactions…</p>
            <p className="muted mt-1 text-xs">Parsing rows · classifying archetype · fitting burn-rate trend</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto"
              viewBox="0 0 24 24"
              width="40"
              height="40"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6" />
              <path d="m9 15 3-3 3 3" />
            </svg>
            <p className="mt-2 text-sm font-semibold">Drag &amp; drop your CSV here</p>
            <p className="muted mt-1 text-xs">or click to browse</p>
          </>
        )}
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
      </div>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="rise-in mt-3 text-sm" style={{ color: "var(--accent-2)" }}>
          ✓ {success}
        </p>
      )}
    </div>
  );
}
