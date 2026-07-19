"use client";

import { useState } from "react";
import PastPanel from "@/components/PastPanel";
import CsvUploadPanel from "@/components/CsvUploadPanel";
import TransactionsPanel from "@/components/TransactionsPanel";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function PastPage() {
  const { activeId } = useFinancialContext();
  const [showReplace, setShowReplace] = useState(false);

  return (
    <div className="grid gap-4">
      {!activeId ? (
        <CsvUploadPanel />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-ghost btn text-sm"
            onClick={() => setShowReplace((v) => !v)}
          >
            {showReplace ? "Hide upload" : "Replace statement"}
          </button>
        </div>
      )}
      {activeId && showReplace ? <CsvUploadPanel compact /> : null}
      <PastPanel />
      {activeId ? <TransactionsPanel /> : null}
    </div>
  );
}
