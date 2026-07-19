/** Unit tests — no server required */
import { parseBankCsv, inferIncomeBracket } from "../lib/csv/parseBankCsv";
import { encryptField, decryptField } from "../lib/security/encryption";
import { signAccessToken, verifyAccessToken } from "../lib/auth/jwt";
import { computeBenchmark } from "../lib/benchmark/computeBenchmark";
import { computeGoal, purchaseDailyBurn } from "../lib/ahead/goalMath";
import { formatDecideReply } from "../lib/decide/formatReply";
import { buildGoalInsight, buildBenchmarkInsights } from "../lib/ahead/insights";
import { detectRecurring } from "../lib/ml/recurring";
import { classifyTransaction } from "../lib/ml/txnClassifier";
import { transactionFingerprint, dedupeTransactions } from "../lib/ml/fingerprint";
import { explainArchetype } from "../lib/ml/learnedArchetypes";
import priya from "../data/personas/persona-priya.json";

async function main() {
  process.env.JWT_ACCESS_SECRET = "unit-test-secret-min-32-chars-long!!";

  const csv = `Date,Narration,Debit Amount,Credit Amount,Balance
01/04/2026,SWIGGY ORDER,450.00,,50000
02/04/2026,SALARY CREDIT,,70000,120000`;

  const parsed = parseBankCsv(csv);
  if (parsed.transactions.length < 2) throw new Error("CSV parser failed");
  if (parsed.detectedFormat !== "indian_bank_debit_credit") throw new Error("format detect");

  // Kotak-style: preamble + Amount + Dr/Cr + timestamped dates
  const kotak = `"Account Statement"
"","","","","Cust. Reln. No.","123"
"Sl. No.","Transaction Date","Value Date","Description","Chq /Ref No.","Amount","Dr / Cr","Balance","Dr / Cr"
"1","20-07-2025 02:12:01","20-07-2025","UPI/Swiggy Limited/520478628930/UPI","UPI-1","419.00","DR","10000","CR"
"2","20-07-2025 03:00:00","20-07-2025","UPI/Vandan Dalwadi/556728625598/UPI","UPI-2","200.00","DR","9800","CR"
"3","21-07-2025 10:00:00","21-07-2025","MB:RECEIVED FROM SOLANKI YASHPALSINH","MB-1","15000.00","CR","24800","CR"
"Closing Balance","as on 21/07/2025 INR 24800"
`;
  const k = parseBankCsv(kotak);
  if (k.detectedFormat !== "kotak_amount_drcr") throw new Error("kotak format");
  if (k.rowCount !== 3) throw new Error(`kotak rows ${k.rowCount}`);
  if (k.transactions[0].category !== "food") throw new Error("swiggy→food");
  if (k.transactions[1].category !== "transfers") throw new Error("p2p→transfers");
  if (k.transactions[2].category !== "income" && k.transactions[2].category !== "transfers") {
    throw new Error("mb credit category");
  }
  if (!k.transactions[0].merchant?.includes("Swiggy")) throw new Error("merchant extract");

  const plain = "HDFC UPI payment ref 12345";
  if (decryptField(encryptField(plain)) !== plain) throw new Error("encryption");

  const tok = await signAccessToken({ sub: "u1", sid: "s1" });
  const pl = await verifyAccessToken(tok);
  if (pl?.sub !== "u1") throw new Error("jwt");

  const bench = computeBenchmark(priya.transactions, priya.income_bracket, priya.city_tier);
  if (!bench?.length) throw new Error("benchmark");

  const goal = computeGoal(50000, "2026-12-31", 70000, 800);
  if (!goal?.target_amount) throw new Error("goal");

  if (purchaseDailyBurn(15000) !== 500) throw new Error("purchaseDailyBurn");
  if (inferIncomeBracket(65000) !== "50k-75k") throw new Error("income bracket");

  const reply = formatDecideReply("", {
    item: "laptop",
    amount: 15000,
    day_shift: 12,
    new_zero_balance_date: "2026-11-01",
    affordable: true,
  }, { monthly_income: 70000, burn_rate: { daily_avg: 800, trend_slope: -50, projected_zero_balance_date: "2026-12-01" } });
  if (!reply.includes("laptop") || !reply.includes("15,000")) throw new Error("formatDecideReply");

  const insight = buildGoalInsight({
    session_id: "x",
    persona: "test",
    monthly_income: 70000,
    archetype: null,
    burn_rate: { daily_avg: 800, trend_slope: -50, projected_zero_balance_date: "2026-12-01" },
    transactions: [],
    goal: { target_amount: 50000, target_date: "2026-12-31", on_pace: true, pace_gap_days: 10 },
    last_decide_verdict: null,
    benchmark: null,
  });
  if (!insight?.headline.includes("pace")) throw new Error("buildGoalInsight");

  const benchInsights = buildBenchmarkInsights({
    session_id: "x",
    persona: "test",
    monthly_income: 70000,
    archetype: null,
    burn_rate: null,
    transactions: [],
    goal: null,
    last_decide_verdict: null,
    benchmark: [{ category: "dining", user_value: 5000, percentile: 80 }],
  });
  if (!benchInsights[0]?.insight.includes("dining")) throw new Error("buildBenchmarkInsights");

  const recurring = detectRecurring(priya.transactions);
  if (!Array.isArray(recurring)) throw new Error("detectRecurring");

  const classified = classifyTransaction(priya.transactions[5], []);
  if (!classified.category || classified.confidence <= 0) throw new Error("txnClassifier");

  const fp = transactionFingerprint(priya.transactions[0]);
  if (fp.length < 16) throw new Error("fingerprint");
  const deduped = dedupeTransactions([priya.transactions[0], priya.transactions[0]], new Set());
  if (deduped.unique.length !== 1 || deduped.skipped !== 1) throw new Error("dedupe");

  const explained = explainArchetype(priya.transactions, priya.monthly_income);
  if (!explained.topDrivers.length || explained.label !== "Disciplined Saver") {
    throw new Error(`explainArchetype ${explained.label}`);
  }

  console.log("  All unit checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
