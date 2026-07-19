import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

import { features } from "@/lib/features";
import { formatDecideReply } from "@/lib/decide/formatReply";
import {
  canIAffordToolDefinition,
  canIAfford,
  type CanIAffordOutput,
} from "@/lib/tools/canIAfford";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { loadSessionTransactions, sessionToSpine } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { actorKey, rateLimit } from "@/lib/security/rateLimit";
import type { FinancialContext, Transaction } from "@/types/financialContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const CRITIC_MODEL = process.env.GROQ_CRITIC_MODEL || "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are FORE's DECIDE assistant — a precise personal-finance advisor.
When the user asks about affording a purchase, you MUST call canIAfford and base your answer ONLY on tool output.
Structure affordability answers in three parts:
1) Clear verdict (Yes / Not right now)
2) Key numbers (amount, day_shift, new_zero_balance_date, daily burn if in context)
3) One concrete recommendation (timing, category to trim, or link to savings goal)
For greetings, reply warmly in 1–2 sentences and suggest an affordability question.
For goal, archetype, or benchmark questions, cite ONLY values from financial_context JSON — never invent numbers.
Be specific and actionable; avoid vague phrases like "be careful" without numbers.`;

function buildSystemPrompt(financialContext: Partial<FinancialContext> | null): string {
  if (!financialContext) return SYSTEM_PROMPT;

  const spine = {
    persona: financialContext.persona,
    monthly_income: financialContext.monthly_income,
    archetype: financialContext.archetype,
    burn_rate: financialContext.burn_rate,
    goal: financialContext.goal,
    benchmark: financialContext.benchmark,
    last_decide_verdict: financialContext.last_decide_verdict,
  };

  return `${SYSTEM_PROMPT}

The user's current financial_context (real computed values — cite these when relevant):
${JSON.stringify(spine, null, 2)}`;
}

interface DecideVerdict {
  item: string;
  amount: number;
  day_shift: number;
  new_zero_balance_date: string;
  affordable: boolean;
}

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
  return turns.slice(-8);
}

const AMOUNT_RE =
  /(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand|lakhs?|lac|cr|crores?)?(?![a-z])/i;
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
  let m = message.match(
    /[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:k|thousand|lakhs?|lac|cr|crores?|rupees?|rs\.?|₹)?\s+(?:on\s+|for\s+)?(?:an?\s+|the\s+)?([a-z][a-z\s-]{1,25})/i
  );
  if (m) return clean(m[1]);
  m = message.match(
    /(?:afford|buy|purchase|get)\s+(?:an?\s+|the\s+)?([a-z][a-z\s-]{1,25}?)\s+(?:for|at|costing|worth|,)?\s*(?:₹|rs\.?|inr)?\s*[0-9]/i
  );
  if (m) return clean(m[1]);
  return "this expense";
}

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
  if (item === "this expense") {
    const prior = priorItemFromHistory(history);
    if (prior) item = prior;
  }
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
    reply: formatDecideReply(out.explanation, toVerdict(item, resolvedAmount, out), null, out.explanation),
    tool_called: true,
    verdict: toVerdict(item, resolvedAmount, out),
    verified: true,
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

function parseToolArgs(raw: string): { item: string; amount: number } {
  try {
    const args = JSON.parse(raw || "{}");
    return {
      item: String(args.item ?? "this expense"),
      amount: Number(args.amount ?? 0),
    };
  } catch {
    return { item: "this expense", amount: 0 };
  }
}

async function exaPriceHint(item: string): Promise<string | null> {
  if (!features.exaGrounding || !process.env.EXA_API_KEY?.trim()) return null;
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify({
        query: `${item} price India rupees 2026`,
        numResults: 2,
        type: "auto",
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { title?: string; text?: string }[] };
    const snippet = data.results?.[0]?.text?.slice(0, 200);
    return snippet ? `Market context (Exa): ${snippet}` : null;
  } catch {
    return null;
  }
}

async function selfVerifyReply(
  groq: Groq,
  reply: string,
  verdict: DecideVerdict | null
): Promise<boolean> {
  if (!features.selfVerify || !verdict || !process.env.GROQ_API_KEY) return true;
  try {
    const check = await groq.chat.completions.create({
      model: CRITIC_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You verify that an assistant's affordability reply matches the tool output exactly. " +
            "Reply ONLY with PASS or FAIL.",
        },
        {
          role: "user",
          content: `Tool output: day_shift=${verdict.day_shift}, date=${verdict.new_zero_balance_date}, affordable=${verdict.affordable}\nAssistant reply: ${reply}`,
        },
      ],
      temperature: 0,
      max_tokens: 8,
    });
    const text = check.choices[0]?.message?.content?.toUpperCase() ?? "";
    return text.includes("PASS");
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message: unknown = body?.message;
  const history = sanitizeHistory(body?.history);

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let transactions: Transaction[] = [];
  let financialContext: Partial<FinancialContext> | null = null;
  let userId: string | null = null;

  if (isDatabaseConfigured()) {
    // Full-stack: require auth and load context server-side (ignore client-supplied rows).
    const auth = await requireAuth(req);
    if (!isAuthPayload(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    userId = auth.sub;
    const spine = await sessionToSpine(auth.sid, auth.sub);
    transactions = await loadSessionTransactions(auth.sid, auth.sub);
    if (!spine || transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions in your session — upload a CSV or load a persona first." },
        { status: 400 }
      );
    }
    financialContext = {
      session_id: spine.session_id,
      persona: spine.persona,
      monthly_income: spine.monthly_income,
      archetype: spine.archetype,
      burn_rate: spine.burn_rate,
      goal: spine.goal,
      benchmark: spine.benchmark,
      last_decide_verdict: spine.last_decide_verdict,
    };
  } else {
    // Demo mode (no DB): client may supply transactions.
    transactions = Array.isArray(body?.transactions) ? body.transactions : [];
    financialContext =
      body?.financial_context && typeof body.financial_context === "object"
        ? body.financial_context
        : null;
    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "Select a persona first — no transactions in context." },
        { status: 400 }
      );
    }
  }

  const limited = await rateLimit({
    key: actorKey(req, "decide", userId),
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests — try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const systemPrompt = buildSystemPrompt(financialContext);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackDecide(message, transactions, history);
  }

  try {
    const groq = new Groq({ apiKey });
    const exaHint = await exaPriceHint(guessItem(message));
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: exaHint ? `${systemPrompt}\n\n${exaHint}` : systemPrompt,
      },
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
      return NextResponse.json({
        reply: choice.content ?? "",
        tool_called: false,
        verdict: null,
        verified: true,
      });
    }

    messages.push(choice);
    let toolExplanation = "";
    let verdict: DecideVerdict | null = null;
    for (const call of toolCalls) {
      if (call.function.name !== "canIAfford") continue;
      const { item, amount } = parseToolArgs(call.function.arguments || "{}");
      const out = await canIAfford({ item, amount, transactions });
      toolExplanation = out.explanation;
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

    const rawReply = second.choices[0].message.content ?? toolExplanation;
    const reply = formatDecideReply(rawReply, verdict, financialContext, toolExplanation);
    const verified = await selfVerifyReply(groq, reply, verdict);

    return NextResponse.json({
      reply: verified
        ? reply
        : `${reply}\n\n(Self-check: re-run the numbers if this looks off — the underlying tool math is still real.)`,
      tool_called: true,
      verdict,
      verified,
      exa_used: !!exaHint,
    });
  } catch (err) {
    console.error("DECIDE Groq error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Decision service temporarily unavailable" }, { status: 502 });
  }
}
