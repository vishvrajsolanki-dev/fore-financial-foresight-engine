import type { Transaction } from "@/types/financialContext";

export interface CsvParseResult {
  transactions: Transaction[];
  rowCount: number;
  skippedRows: number;
  detectedFormat: string;
  warnings: string[];
  duplicatesRemoved: number;
}

type ColumnMap = {
  date?: number;
  description?: number;
  debit?: number;
  credit?: number;
  amount?: number;
  drCr?: number;
  balance?: number;
  ref?: number;
};

const DATE_ALIASES = [
  "transaction date",
  "txn date",
  "value date",
  "posting date",
  "date",
];
const DESC_ALIASES = [
  "description",
  "narration",
  "particulars",
  "transaction remarks",
  "remarks",
  "details",
];
const DEBIT_ALIASES = ["debit amount", "withdrawal amount", "debit", "withdrawal", "dr"];
const CREDIT_ALIASES = ["credit amount", "deposit amount", "credit", "deposit", "cr"];
const AMOUNT_ALIASES = ["transaction amount", "amount"];
const DRCR_ALIASES = ["dr / cr", "dr/cr", "type", "txn type", "transaction type", "debit/credit"];
const BALANCE_ALIASES = ["balance", "closing balance", "running balance"];
const REF_ALIASES = ["chq / ref no", "chq/ref no", "ref no", "reference", "cheque no", "chq no"];

const CATEGORY_KEYWORDS: Record<string, RegExp[]> = {
  food: [
    /swiggy|zomato|restaurant|cafe|food|grocery|dmart|bigbasket|dominos|mcdonald|zepto|blinkit|instamart|eatsure|faasos|box8|behrouz|pizza|burger|starbucks|ccd|chai|milk|dairy|egg green|mahi milk|rocksoul cafe/i,
  ],
  shopping: [
    /amazon|flipkart|myntra|shopping|mall|zara|decathlon|electronics|meesho|ajio|nykaa|tata cliq|croma|reliance digital/i,
  ],
  bills: [
    /electricity|water bill|rent|broadband|recharge|mobile|gas|emi|insurance|airtel|jio|vi |vodafone|bsnl|amb non maintenance|non maintenance chrg|charge|chrg:|billdesk|bharat bill|bbps|fastag|petrol|fuel|indian oil|hpcl|bpcl|shell|jay somnath pet/i,
  ],
  entertainment: [
    /netflix|spotify|bookmyshow|movie|pub|concert|gaming|hotstar|prime video|disney|youtube|sony liv|zee5/i,
  ],
  savings: [/sip|mutual fund|rd deposit|fixed deposit|\bsavings\b|nps|groww|zerodha|upstox|kuvera/i],
};

const FOOTER_MARKERS = [
  /^closing balance/i,
  /^important note/i,
  /^the transaction date refers/i,
  /^you may call/i,
  /^write to us/i,
  /^csv statement/i,
  /^the number of transactions/i,
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(headers: string[], aliases: string[]): number | undefined {
  // Prefer exact alias matches before substring matches to avoid
  // "Dr / Cr" winning over a real "Debit" column, etc.
  for (const alias of aliases) {
    for (let i = 0; i < headers.length; i++) {
      if (normalizeHeader(headers[i]) === alias) return i;
    }
  }
  for (const alias of aliases) {
    for (let i = 0; i < headers.length; i++) {
      const h = normalizeHeader(headers[i]);
      if (h.includes(alias) && !(alias === "dr" && h.includes("dr /"))) return i;
      if (h.includes(alias) && !(alias === "cr" && h.includes("/ cr"))) return i;
    }
  }
  return undefined;
}

function mapColumns(headers: string[]): ColumnMap {
  return {
    date: findColumn(headers, DATE_ALIASES),
    description: findColumn(headers, DESC_ALIASES),
    debit: findColumn(headers, DEBIT_ALIASES),
    credit: findColumn(headers, CREDIT_ALIASES),
    amount: findColumn(headers, AMOUNT_ALIASES),
    drCr: findColumn(headers, DRCR_ALIASES),
    balance: findColumn(headers, BALANCE_ALIASES),
    ref: findColumn(headers, REF_ALIASES),
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((c === "," || c === "\t") && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function parseAmount(raw: string): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/[₹,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: string): string | null {
  if (!raw?.trim()) return null;
  // Strip trailing time ("20-07-2025 02:12:01" → "20-07-2025")
  const s = raw.trim().split(/\s+/)[0];

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD-MMM-YYYY e.g. 01-Apr-2026
  m = s.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{4})$/);
  if (m) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${mo}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function isDrCrDebit(raw: string): boolean | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  if (v === "DR" || v === "DEBIT" || v.startsWith("DR")) return true;
  if (v === "CR" || v === "CREDIT" || v.startsWith("CR")) return false;
  return null;
}

function looksLikePersonName(name: string): boolean {
  const n = name.trim();
  if (!n || n.length < 3) return false;
  // Known brand / corporate tokens → not a person
  if (
    /limited|ltd|pvt|private|market|mart|cafe|restaurant|petrol|fuel|bank|airtel|jio|swiggy|zomato|amazon|flipkart|zepto|blinkit|upi|payment|charge|chrg/i.test(
      n
    )
  ) {
    return false;
  }
  // Two+ alphabetic tokens is the common UPI P2P pattern ("Vandan Dalwadi")
  const parts = n.split(/\s+/).filter((p) => /[a-zA-Z]{2,}/.test(p));
  return parts.length >= 2;
}

export function categorizeDescription(description: string): string {
  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (patterns.some((p) => p.test(description))) return cat;
  }
  // Person-to-person UPI / mobile-banking transfers are not "shopping".
  const upiName = description.match(/^UPI\/([^/]+)/i)?.[1] ?? "";
  if (upiName && looksLikePersonName(upiName)) return "transfers";
  if (/^MB:\s*(SENT TO|RECEIVED FROM)/i.test(description)) return "transfers";
  return "shopping";
}

/** Extract a readable merchant token from Indian bank / UPI narrations. */
export function extractMerchant(description: string): string | undefined {
  if (!description?.trim()) return undefined;
  const d = description.trim();

  // UPI/MERCHANT NAME/...  or UPI-...
  const upi = d.match(/^UPI\/([^/]+)/i);
  if (upi) {
    return upi[1]
      .replace(/\s+/g, " ")
      .replace(/[^a-zA-Z0-9 .&'-]/g, "")
      .trim()
      .slice(0, 48) || undefined;
  }

  // MB: SENT TO / RECEIVED FROM NAME
  const mb = d.match(/^MB:\s*(?:SENT TO|RECEIVED FROM)\s+(.+)$/i);
  if (mb) return mb[1].trim().slice(0, 48);

  // CHRG: ...
  const chrg = d.match(/^CHRG:\s*(.+)$/i);
  if (chrg) return chrg[1].trim().slice(0, 48);

  // Fallback: first meaningful token run
  const cleaned = d.replace(/[^a-zA-Z0-9 /&.-]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 48) || undefined;
}

function detectFormat(cols: ColumnMap): string {
  if (cols.amount != null && cols.drCr != null) return "kotak_amount_drcr";
  if (cols.debit != null && cols.credit != null) return "indian_bank_debit_credit";
  if (cols.amount != null) return "single_amount_column";
  return "generic";
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.map(normalizeHeader).join("|");
  const hasDate = DATE_ALIASES.some((a) => joined.includes(a));
  const hasDesc = DESC_ALIASES.some((a) => joined.includes(a));
  const hasAmt =
    AMOUNT_ALIASES.some((a) => joined.includes(a)) ||
    DEBIT_ALIASES.some((a) => joined.includes(a)) ||
    CREDIT_ALIASES.some((a) => joined.includes(a));
  return hasDate && (hasDesc || hasAmt);
}

function isFooterRow(cells: string[]): boolean {
  const first = (cells[0] ?? "").trim();
  if (!first) return false;
  return FOOTER_MARKERS.some((re) => re.test(first));
}

function dedupeKey(t: Transaction, ref?: string): string {
  return [t.date, t.amount.toFixed(2), (t.description ?? "").toLowerCase(), ref ?? ""].join("|");
}

/** Parse real-world bank CSV exports (HDFC, ICICI, SBI, Kotak-style). */
export function parseBankCsv(text: string): CsvParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one transaction");
  }

  // Skip bank statement preamble (account holder block) to find the real header.
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const cells = parseCsvLine(lines[i]);
    if (looksLikeHeader(cells)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error(
      "Could not find a transaction header row (expected Date / Description / Amount columns). " +
        "Supported: HDFC, ICICI, SBI, Kotak exports."
    );
  }
  if (headerIdx > 0) {
    warnings.push(`Skipped ${headerIdx} preamble row(s) before the transaction table.`);
  }

  const headers = parseCsvLine(lines[headerIdx]);
  const cols = mapColumns(headers);
  if (cols.date == null) {
    throw new Error("Could not find a date column (expected Date, Value Date, Transaction Date, etc.)");
  }
  if (cols.description == null && cols.debit == null && cols.credit == null && cols.amount == null) {
    throw new Error("Could not find amount or description columns");
  }

  const detectedFormat = detectFormat(cols);
  const transactions: Transaction[] = [];
  let skippedRows = 0;
  const seen = new Set<string>();
  let duplicatesRemoved = 0;
  let openingBalance: number | null = null;
  let openingDate: string | null = null;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;
    if (isFooterRow(cells)) break;

    const dateRaw = cells[cols.date] ?? "";
    const iso = normalizeDate(dateRaw);
    if (!iso) {
      skippedRows++;
      continue;
    }

    const description = cols.description != null ? (cells[cols.description] ?? "").trim() : "";
    let amount: number | null = null;

    if (cols.amount != null && cols.drCr != null) {
      // Kotak-style: single Amount + Dr/Cr indicator
      const raw = parseAmount(cells[cols.amount] ?? "");
      const isDebit = isDrCrDebit(cells[cols.drCr] ?? "");
      if (raw != null && isDebit != null) {
        amount = isDebit ? -Math.abs(raw) : Math.abs(raw);
      } else if (raw != null) {
        amount = raw;
      }
    } else if (cols.debit != null || cols.credit != null) {
      const debit = cols.debit != null ? parseAmount(cells[cols.debit] ?? "") : null;
      const credit = cols.credit != null ? parseAmount(cells[cols.credit] ?? "") : null;
      if (credit != null && credit > 0) amount = credit;
      else if (debit != null && debit > 0) amount = -debit;
    } else if (cols.amount != null) {
      const raw = parseAmount(cells[cols.amount] ?? "");
      if (raw != null) amount = raw;
    }

    if (amount == null || amount === 0) {
      skippedRows++;
      continue;
    }

    // Seed opening balance from the first row's Balance column so charts match the statement.
    if (openingBalance == null && cols.balance != null) {
      const balAfter = parseAmount(cells[cols.balance] ?? "");
      if (balAfter != null) {
        const impliedOpen = balAfter - amount;
        if (Number.isFinite(impliedOpen) && impliedOpen > 0.005) {
          openingBalance = Math.round(impliedOpen * 100) / 100;
          openingDate = iso;
        } else {
          openingBalance = 0;
        }
      }
    }

    // Credits: keep P2P receipts as transfers (not "income"/salary),
    // so archetype income ratios aren't inflated by friend reimbursements.
    let category: string;
    if (amount > 0) {
      const descCat = categorizeDescription(description);
      category = descCat === "transfers" ? "transfers" : "income";
      if (
        category === "income" &&
        !/salary|payroll|neft|imps|interest|refund|cashback/i.test(description) &&
        /^UPI\//i.test(description)
      ) {
        const upiName = description.match(/^UPI\/([^/]+)/i)?.[1] ?? "";
        if (upiName && looksLikePersonName(upiName)) category = "transfers";
      }
    } else {
      category = categorizeDescription(description);
    }

    const merchant = extractMerchant(description);
    const ref = cols.ref != null ? (cells[cols.ref] ?? "").trim() : "";

    const txn: Transaction = {
      date: iso,
      category,
      amount,
      description: description || undefined,
      ...(merchant ? { merchant } : {}),
    };

    const key = dedupeKey(txn, ref);
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);

    transactions.push(txn);
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  if (openingBalance != null && openingBalance > 0 && openingDate) {
    transactions.unshift({
      date: openingDate,
      category: "opening_balance",
      amount: openingBalance,
      description: "Opening balance (from statement)",
    });
    warnings.push(`Seeded opening balance ₹${openingBalance.toLocaleString("en-IN")} from statement.`);
  }

  if (transactions.length < 10) {
    warnings.push("Fewer than 10 transactions parsed — check column mapping or date format.");
  }
  if (duplicatesRemoved > 0) {
    warnings.push(`Removed ${duplicatesRemoved} duplicate row(s).`);
  }

  return {
    transactions,
    rowCount: transactions.length,
    skippedRows,
    detectedFormat,
    warnings,
    duplicatesRemoved,
  };
}

export function inferIncomeBracket(monthlyIncome: number): string {
  if (monthlyIncome < 25000) return "0-25k";
  if (monthlyIncome < 50000) return "25k-50k";
  if (monthlyIncome < 75000) return "50k-75k";
  if (monthlyIncome < 100000) return "75k-100k";
  return "100k+";
}

export function inferCityTier(cityTier: string): string {
  const t = cityTier.trim();
  if (/tier\s*[-]?\s*1/i.test(t) || t === "1") return "Tier 1";
  if (/tier\s*[-]?\s*3/i.test(t) || t === "3") return "Tier 3";
  return "Tier 2";
}
