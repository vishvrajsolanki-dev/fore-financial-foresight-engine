/** Deterministic self-verify: compare numeric claims in assistant reply vs tool_trace. */

type ToolTraceEntry = { name: string; args?: unknown; result?: unknown };

const NUMBER_RE = /(?:₹|rs\.?\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)/gi;

function extractNumbers(text: string): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(NUMBER_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function collectToolNumbers(trace: ToolTraceEntry[]): Set<number> {
  const allowed = new Set<number>();

  const add = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      allowed.add(Math.round(v));
      allowed.add(Math.round(v * 100) / 100);
    }
    if (typeof v === "string") {
      const d = v.match(/(\d{4}-\d{2}-\d{2})/);
      if (d) allowed.add(Number(d[1].replace(/-/g, "")));
    }
  };

  const walk = (obj: unknown) => {
    if (obj == null) return;
    if (typeof obj === "number") {
      add(obj);
      return;
    }
    if (typeof obj === "string") {
      add(obj);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    if (typeof obj === "object") {
      for (const v of Object.values(obj as Record<string, unknown>)) walk(v);
    }
  };

  for (const entry of trace) {
    walk(entry.result);
    walk(entry.args);
  }

  return allowed;
}

function numberAllowed(n: number, allowed: Set<number>): boolean {
  const rounded = Math.round(n);
  if (allowed.has(rounded) || allowed.has(Math.round(n * 100) / 100)) return true;
  // Allow small integers that are likely prose (e.g. "3 parts") when no tool numbers
  if (allowed.size === 0 && n <= 3) return true;
  // Fuzzy match within 2% for large currency values
  for (const a of allowed) {
    if (a > 100 && Math.abs(a - rounded) / a < 0.02) return true;
  }
  return false;
}

export function verifyReplyAgainstTools(reply: string, toolTrace: ToolTraceEntry[]): boolean {
  if (!toolTrace.length) return true;

  const replyNumbers = extractNumbers(reply);
  if (!replyNumbers.length) return true;

  const allowed = collectToolNumbers(toolTrace);
  if (!allowed.size) return true;

  const significant = replyNumbers.filter((n) => Math.abs(n) >= 10 || Number.isInteger(n));
  if (!significant.length) return true;

  return significant.every((n) => numberAllowed(n, allowed));
}
