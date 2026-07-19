/**
 * End-to-end verification of a real bank statement against FORE's pipeline.
 * Usage: npx tsx scripts/verify_real_csv.ts <path-to.csv> [monthlyIncome]
 */
import { readFileSync } from "fs";
import { parseBankCsv, extractMerchant, categorizeDescription } from "../lib/csv/parseBankCsv";
import { classify } from "../lib/ml/classify";
import { computeBurnRate } from "../lib/ml/burnRate";
import { canIAffordMath } from "../lib/ml/canIAfford";
import { computeBenchmark } from "../lib/benchmark/computeBenchmark";
import { inferIncomeBracket, inferCityTier } from "../lib/csv/parseBankCsv";

const path = process.argv[2];
const income = Number(process.argv[3] || 60000);
if (!path) {
  console.error("Usage: npx tsx scripts/verify_real_csv.ts <csv> [monthlyIncome]");
  process.exit(1);
}

const text = readFileSync(path, "utf8");
const parsed = parseBankCsv(text);

console.log("=== PARSE ===");
console.log({
  format: parsed.detectedFormat,
  rowCount: parsed.rowCount,
  skipped: parsed.skippedRows,
  duplicatesRemoved: parsed.duplicatesRemoved,
  warnings: parsed.warnings,
});

const cats: Record<string, { count: number; spend: number }> = {};
for (const t of parsed.transactions) {
  if (!cats[t.category]) cats[t.category] = { count: 0, spend: 0 };
  cats[t.category].count++;
  if (t.amount < 0) cats[t.category].spend += Math.abs(t.amount);
}
console.log("=== CATEGORIES ===");
console.log(cats);

const withMerchant = parsed.transactions.filter((t) => t.merchant).length;
console.log("=== MERCHANTS ===");
console.log({
  extracted: withMerchant,
  sample: parsed.transactions
    .filter((t) => t.merchant)
    .slice(0, 8)
    .map((t) => ({ merchant: t.merchant, category: t.category, amount: t.amount })),
});

// Demonstrate one known food txn
const swiggy = parsed.transactions.find((t) => /swiggy/i.test(t.description || ""));
if (swiggy) {
  console.log("=== SAMPLE CLASSIFICATION (Swiggy) ===");
  console.log({
    description: swiggy.description,
    merchant: extractMerchant(swiggy.description || ""),
    category: categorizeDescription(swiggy.description || ""),
    amount: swiggy.amount,
  });
}

const unknownish = parsed.transactions.find(
  (t) => t.amount < 0 && t.category === "shopping" && !/amazon|flipkart|myntra|shopping/i.test(t.description || "")
);
if (unknownish) {
  console.log("=== UNKNOWN DEBIT (defaulted to shopping) ===");
  console.log({
    description: unknownish.description,
    merchant: unknownish.merchant,
    category: unknownish.category,
    amount: unknownish.amount,
  });
}

console.log("=== CLASSIFY ===");
const archetype = classify(parsed.transactions, income);
console.log(archetype);

console.log("=== BURN RATE ===");
const burn = computeBurnRate(parsed.transactions);
console.log(burn);

console.log("=== BENCHMARK ===");
const bench = computeBenchmark(
  parsed.transactions,
  inferIncomeBracket(income),
  inferCityTier("Tier 2")
);
console.log(bench);

console.log("=== CAN I AFFORD (₹5000) ===");
const afford = canIAffordMath("weekend trip", 5000, parsed.transactions);
console.log(afford);

if (parsed.rowCount < 50) {
  console.error("FAIL: expected >= 50 transactions from a year of Kotak data");
  process.exit(1);
}
if (parsed.detectedFormat !== "kotak_amount_drcr") {
  console.error("FAIL: expected kotak_amount_drcr format, got", parsed.detectedFormat);
  process.exit(1);
}
if (!archetype.label) {
  console.error("FAIL: no archetype");
  process.exit(1);
}
console.log("\nPASS: real CSV end-to-end pipeline OK");
