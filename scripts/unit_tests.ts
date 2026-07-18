/** Unit tests — no server required */
import { parseBankCsv, inferIncomeBracket } from "../lib/csv/parseBankCsv";
import { encryptField, decryptField } from "../lib/security/encryption";
import { signAccessToken, verifyAccessToken } from "../lib/auth/jwt";
import { computeBenchmark } from "../lib/benchmark/computeBenchmark";
import { computeGoal, purchaseDailyBurn } from "../lib/context/FinancialContextProvider";
import priya from "../data/personas/persona-priya.json";

async function main() {
  process.env.JWT_ACCESS_SECRET = "unit-test-secret-min-32-chars-long!!";

  const csv = `Date,Narration,Debit Amount,Credit Amount,Balance
01/04/2026,SWIGGY ORDER,450.00,,50000
02/04/2026,SALARY CREDIT,,70000,120000`;

  const parsed = parseBankCsv(csv);
  if (parsed.transactions.length < 2) throw new Error("CSV parser failed");
  if (parsed.detectedFormat !== "indian_bank_debit_credit") throw new Error("format detect");

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

  console.log("  All unit checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
