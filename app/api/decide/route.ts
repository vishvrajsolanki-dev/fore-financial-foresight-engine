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

// --- Keyless fallback: still honours the contract (real canIAfford call), just without the LLM. ---
const AMOUNT_RE = /(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand|lakh|l)?/i;
const AFFORD_INTENT_RE = /(afford|buy|purchase|spend|get a|should i|can i)/i;

function parseAmount(message: string): number | null {
  const m = message.match(AMOUNT_RE);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k" || unit === "thousand") n *= 1000;
  if (unit === "lakh" || unit === "l") n *= 100000;
  return Number.isFinite(n) ? n : null;
}

function guessItem(message: string): string {
  const m = message.match(/(?:afford|buy|purchase|get)(?:\s+an?|\s+the)?\s+([a-z][a-z\s-]{1,30})/i);
  return m ? m[1].trim().replace(/\s+(next|this|for|at|in)\b.*$/i, "").trim() : "this expense";
}

async function fallbackDecide(message: string, transactions: Transaction[]) {
  const amount = parseAmount(message);
  const hasIntent = AFFORD_INTENT_RE.test(message);
  if (amount === null || !hasIntent) {
    return NextResponse.json({
      reply:
        "Hi! Ask me something like \"Can I afford a ₹15,000 laptop next month?\" and I'll run the " +
        "real numbers against your spending.",
      tool_called: false,
      verdict: null,
      note: "GROQ_API_KEY not set — using deterministic fallback (still calls the real canIAfford function).",
    });
  }
  const item = guessItem(message);
  const out = await canIAfford({ item, amount, transactions });
  return NextResponse.json({
    reply: out.explanation,
    tool_called: true,
    verdict: toVerdict(item, amount, out),
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
    return fallbackDecide(message, transactions);
  }

  try {
    const groq = new Groq({ apiKey });
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
