export type CurrencyCode = "INR" | "USD" | "EUR";

const RATES: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
};

const SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
};

export function formatMoney(amountInr: number, currency: CurrencyCode = "INR"): string {
  const converted = amountInr * RATES[currency];
  const sym = SYMBOLS[currency];
  if (currency === "INR") {
    return sym + Math.round(converted).toLocaleString("en-IN");
  }
  return sym + converted.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function parseInrFromMessage(message: string): number | null {
  const m = message.match(/(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
