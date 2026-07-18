// FORE — app/api/decide/route.ts
// Owner: TASK-005 (Allen, skeleton) / TASK-008 (Allen, chat wiring).
// Accepts a chat message + the active persona's transactions, calls Groq/Llama 3.1 with
// tool-calling enabled, and executes canIAfford() when the model requests it.
// Dev GROQ_API_KEY only until TASK-012's rotation, per CONTRACT-008.
//
// Anti-hallucination rule (CONTRACT-004): every affordability number the user sees MUST come from
// a real canIAfford tool call. The response reports tool_called so the UI can show the trust badge.

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

import {
  canIAffordToolDefinition,
  canIAfford,
  type CanIAffordOutput,
} from "@/lib/tools/canIAfford";
import type { Transaction } from "@/types/financialContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are FORE's DECIDE assistant, a grounded personal-finance helper.
When the user asks whether they can afford a purchase or expense (anything with a rupee amount or
a clear item to buy), you MUST call the canIAfford tool and base your entire answer ONLY on its
returned values (affordable, day_shift, new_zero_balance_date, explanation). Never invent or state
a day-shift, date, or affordability judgement yourself — only report what the tool returns.
For greetings or messages that are not about affording something, reply briefly and do NOT call the
tool. Keep answers concise and friendly.`;

interface DecideVerdict {
  item: string;
  amount: number;
  day_shift: number;
  new_zero_balance_date: string;
  affordable: boolean;
}

// Optional prior conversation turns the UI sends so contextual follow-ups ("what about ₹5,000
// instead?") resolve the right item. Backward compatible: absent history == single-message request,
// so TASK-005's original curl test is unaffected.
interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const t of raw) {
    const role = t?.role;
    const content = t?.content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      turns.push({ role, content });
    }
  }
  // Keep the recent tail bounded so payload/token use stays sane on a long chat.
  return turns.slice(-8);
}

// --- Keyless fallback: still honours the contract (real canIAfford call), just without the LLM. ---
// Unit suffixes are matched only as whole tokens (k/thousand/lakh/cr), so the "l" in "laptop"
// is never mistaken for "lakh". Amount is capped to a sane ceiling.
const AMOUNT_RE =
  /(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand|lakhs?|lac|cr|crores?)?(?![a-z])/i;
// Include follow-up phrasing from the demo script ("what about ₹5,000 instead?").
const AFFORD_INTENT_RE =
  /(afford|buy|purchase|spend|should i|can i|get|what about|how about|instead)/i;
const TRAILING_FILLER_RE =
  /\s+(next|this|last)?\s*(month|week|year|now|today|please|instead|for|at|in|on)\b.*$/i;

function parseAmount(message: string): number | null {
  const m = message.match(AMOUNT_RE);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k" || unit === "thousand") n *= 1000;
  else if (unit.startsWith("lakh") || unit === "lac") n *= 100000;
  else if (unit === "cr" || unit.startsWith("crore")) n *= 10000000;
  if (!Number.isFinite(n) || n <= 0 || n > 1e8) return null;
  return n;
}

// Words that can slip into the item capture group but are not real purchases — treat them as "no
// item named", so a follow-up like "what about ₹5,000 instead?" falls back to the carried-over item.
const NON_ITEM_WORDS = new Set([
  "instead", "now", "today", "then", "again", "please", "one", "ones", "it", "that", "this",
  "something", "else", "more", "less", "much", "expense", "this expense", "month", "week", "year",
]);

function clean(item: string): string {
  const cleaned = item
    .trim()
    .replace(TRAILING_FILLER_RE, "")
    .replace(/[.?!,]+$/, "")
    .trim();
  if (!cleaned || NON_ITEM_WORDS.has(cleaned.toLowerCase())) return "this expense";
  return cleaned;
}

function guessItem(message: string): string {
  // Item named right after the amount: "... 15000 laptop", "buy ₹5,000 headphones".
  let m = message.match(
    /[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:k|thousand|lakhs?|lac|cr|crores?|rupees?|rs\.?|₹)?\s+(?:on\s+|for\s+)?(?:an?\s+|the\s+)?([a-z][a-z\s-]{1,25})/i
  );
  if (m) return clean(m[1]);
  // Item named before the amount: "a laptop for 15000".
  m = message.match(
    /(?:afford|buy|purchase|get)\s+(?:an?\s+|the\s+)?([a-z][a-z\s-]{1,25}?)\s+(?:for|at|costing|worth|,)?\s*(?:₹|rs\.?|inr)?\s*[0-9]/i
  );
  if (m) return clean(m[1]);
  return "this expense";
}

// Look back through prior USER turns for the most recently named item, so a bare follow-up like
// "what about ₹5,000 instead?" still knows it's about the laptop (handout Testing & Verification #4).
function priorItemFromHistory(history: ChatTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const guessed = guessItem(history[i].content);
    if (guessed !== "this expense") return guessed;
  }
  return null;
}

async function fallbackDecide(
  message: string,
  transactions: Transaction[],
  history: ChatTurn[]
) {
  const amount = parseAmount(message);
  const hasIntent = AFFORD_INTENT_RE.test(message);
  let item = guessItem(message);
  // Contextual follow-up: amount present but no item named this turn -> reuse the last one.
  if (item === "this expense") {
    const prior = priorItemFromHistory(history);
    if (prior) item = prior;
  }
  // Treat as an affordability query when we have an amount AND either an explicit intent word or a
  // known item (named now or carried over from the conversation).
  const isAffordQuery = amount !== null && (hasIntent || item !== "this expense");
  if (!isAffordQuery) {
    return NextResponse.json({
      reply:
        "Hi! Ask me something like \"Can I afford a ₹15,000 laptop next month?\" and I'll run the " +
        "real numbers against your spending.",
      tool_called: false,
      verdict: null,
      note: "GROQ_API_KEY not set — using deterministic fallback (still calls the real canIAfford function).",
    });
  }
  const resolvedAmount = amount as number;
  const out = await canIAfford({ item, amount: resolvedAmount, transactions });
  return NextResponse.json({
    reply: out.explanation,
    tool_called: true,
    verdict: toVerdict(item, resolvedAmount, out),
    note: "GROQ_API_KEY not set — used deterministic fallback; affordability numbers are still real.",
  });
}

function toVerdict(item: string, amount: number, out: CanIAffordOutput): DecideVerdict {
  return {
    item,
    amount,
    day_shift: out.day_shift,
    new_zero_balance_date: out.new_zero_balance_date,
    affordable: out.affordable,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message: unknown = body?.message;
  const transactions: Transaction[] = Array.isArray(body?.transactions) ? body.transactions : [];
  const history = sanitizeHistory(body?.history);

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "Select a persona first — no transactions in context." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackDecide(message, transactions, history);
  }

  try {
    const groq = new Groq({ apiKey });
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: message },
    ];

    const first = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools: [canIAffordToolDefinition],
      tool_choice: "auto",
      temperature: 0.2,
    });

    const choice = first.choices[0].message;
    const toolCalls = choice.tool_calls ?? [];

    if (toolCalls.length === 0) {
      // No affordability intent — return the model's direct reply, no tool used.
      return NextResponse.json({
        reply: choice.content ?? "",
        tool_called: false,
        verdict: null,
      });
    }

    // Execute each requested tool call (real math), feed results back to the model.
    messages.push(choice);
    let verdict: DecideVerdict | null = null;
    for (const call of toolCalls) {
      if (call.function.name !== "canIAfford") continue;
      const args = JSON.parse(call.function.arguments || "{}");
      const item = String(args.item ?? "this expense");
      const amount = Number(args.amount ?? 0);
      const out = await canIAfford({ item, amount, transactions });
      verdict = toVerdict(item, amount, out);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(out),
      });
    }

    const second = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,
    });

    return NextResponse.json({
      reply: second.choices[0].message.content ?? verdict?.new_zero_balance_date ?? "",
      tool_called: true,
      verdict,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Groq request failed";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
