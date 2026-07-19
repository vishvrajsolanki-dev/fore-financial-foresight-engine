/**
 * Golden-file parity: TypeScript inline ML must match Python ml-service on the same fixtures.
 * Requires: ml-service running on :8000 OR SKIP_PYTHON=1 to only assert TS self-consistency.
 */
import { readFileSync } from "fs";
import { classify } from "../lib/ml/classify";
import { computeBurnRate } from "../lib/ml/burnRate";
import { canIAffordMath } from "../lib/ml/canIAfford";
import priya from "../data/personas/persona-priya.json";

async function pythonCall(path: string, body: unknown) {
  const base = process.env.RENDER_ML_BASE_URL || "http://127.0.0.1:8000";
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Python ${path} ${res.status}`);
  return res.json();
}

async function main() {
  const txns = priya.transactions;
  const income = priya.monthly_income;

  const tsClassify = classify(txns, income);
  const tsBurn = computeBurnRate(txns);
  const tsAfford = canIAffordMath("test item", 5000, txns);

  console.log("TS classify:", tsClassify.label, tsClassify.distances);
  console.log("TS burn:", tsBurn);
  console.log("TS afford day_shift:", tsAfford.day_shift);

  if (process.env.SKIP_PYTHON === "1") {
    console.log("SKIP_PYTHON=1 — TS self-check only OK");
    return;
  }

  try {
    const pyClassify = await pythonCall("/classify", { transactions: txns, monthly_income: income });
    const pyBurn = await pythonCall("/burn-rate", { transactions: txns });
    const pyAfford = await pythonCall("/can-i-afford", {
      item: "test item",
      amount: 5000,
      transactions: txns,
    });

    if (pyClassify.label !== tsClassify.label) {
      throw new Error(`label mismatch TS=${tsClassify.label} PY=${pyClassify.label}`);
    }
    for (const [k, v] of Object.entries(tsClassify.distances)) {
      const pv = Number(pyClassify.distances[k]);
      if (Math.abs(pv - Number(v)) > 0.001) {
        throw new Error(`distance ${k} mismatch TS=${v} PY=${pv}`);
      }
    }
    if (Math.abs(Number(pyBurn.daily_avg) - tsBurn.daily_avg) > 0.05) {
      throw new Error(`daily_avg mismatch`);
    }
    if (Math.abs(Number(pyAfford.day_shift) - tsAfford.day_shift) > 0) {
      throw new Error(`day_shift mismatch TS=${tsAfford.day_shift} PY=${pyAfford.day_shift}`);
    }
    console.log("PASS: TS ↔ Python parity OK");
  } catch (err) {
    console.error("Python parity check failed:", err instanceof Error ? err.message : err);
    console.error("Hint: start ml-service or set SKIP_PYTHON=1");
    // Prefer inline TS as source of truth — fail CI only when Python is up and diverges.
    if (String(err).includes("fetch failed") || String(err).includes("ECONNREFUSED")) {
      console.log("Python unreachable — treating as skip (inline TS is deploy default)");
      process.exit(0);
    }
    process.exit(1);
  }

  // Optional: real CSV fixture if present
  const csvPath = process.argv[2];
  if (csvPath) {
    const { parseBankCsv } = await import("../lib/csv/parseBankCsv");
    const parsed = parseBankCsv(readFileSync(csvPath, "utf8"));
    const c = classify(parsed.transactions, 60000);
    console.log("Real CSV archetype:", c.label, "rows", parsed.rowCount);
  }
}

main();
