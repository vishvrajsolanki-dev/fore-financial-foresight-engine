import type { Transaction } from "@/types/financialContext";

export interface CsvParseResult {
  transactions: Transaction[];
  rowCount: number;
  skippedRows: number;
  detectedFormat: string;
  warnings: string[];
}

type ColumnMap = {
  date?: number;
  description?: number;
  debit?: number;
  credit?: number;
  amount?: number;
};

const DATE_ALIASES = ["date", "transaction date", "txn date", "value date", "posting date"];
const DESC_ALIASES = [
  "description",
  "narration",
  "particulars",
  "transaction remarks",
  "remarks",
  "details",
];
const DEBIT_ALIASES = ["debit", "debit amount", "withdrawal", "withdrawal amount", "dr"];
const CREDIT_ALIASES = ["credit", "credit amount", "deposit", "deposit amount", "cr"];
const AMOUNT_ALIASES = ["amount", "transaction amount"];

const CATEGORY_KEYWORDS: Record<string, RegExp[]> = {
  food: [/swiggy|zomato|restaurant|cafe|food|grocery|dmart|bigbasket|dominos|mcdonald/i],
  shopping: [/amazon|flipkart|myntra|shopping|mall|zara|decathlon|electronics/i],
  bills: [/electricity|water bill|rent|broadband|recharge|mobile|gas|emi|insurance/i],
  entertainment: [/netflix|spotify|bookmyshow|movie|pub|concert|gaming|hotstar/i],
  savings: [/sip|mutual fund|rd deposit|fixed deposit|savings|nps/i],
};

function normalizeHeader(h: string): string {
  return h.trim().replace(/^\ufeff/, "").toLowerCase().replace(/\s+/g, " ");
}

/** Match header aliases without false positives (e.g. "cr" inside "description"). */
function matchesAlias(header: string, alias: string): boolean {
  if (header === alias) return true;
  if (alias.includes(" ")) return header.includes(alias);
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[\\s_./-])${escaped}(?:$|[\\s_./-])`);
  return re.test(` ${header} `);
}

function findColumn(headers: string[], aliases: string[]): number | undefined {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (aliases.some((a) => h === a)) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (aliases.some((a) => matchesAlias(h, a))) return i;
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
  const s = raw.trim();
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

export function categorizeDescription(description: string): string {
  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (patterns.some((p) => p.test(description))) return cat;
  }
  return "shopping";
}

function detectFormat(cols: ColumnMap): string {
  if (cols.debit != null && cols.credit != null) return "indian_bank_debit_credit";
  if (cols.amount != null) return "single_amount_column";
  return "generic";
}

/** Parse real-world bank CSV exports (HDFC, ICICI, SBI-style column names). */
export function parseBankCsv(text: string): CsvParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one transaction");
  }

  const headers = parseCsvLine(lines[0]);
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

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;

    const dateRaw = cells[cols.date] ?? "";
    const iso = normalizeDate(dateRaw);
    if (!iso) {
      skippedRows++;
      continue;
    }

    const description = cols.description != null ? (cells[cols.description] ?? "").trim() : "";
    let amount: number | null = null;

    if (cols.debit != null || cols.credit != null) {
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

    const category =
      amount > 0 && /salary|income|credit|transfer from/i.test(description)
        ? "income"
        : amount > 0
          ? "income"
          : categorizeDescription(description);

    transactions.push({
      date: iso,
      category,
      amount,
      description: description || undefined,
    });
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  if (transactions.length < 10) {
    warnings.push("Fewer than 10 transactions parsed — check column mapping or date format.");
  }

  return {
    transactions,
    rowCount: transactions.length,
    skippedRows,
    detectedFormat,
    warnings,
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
