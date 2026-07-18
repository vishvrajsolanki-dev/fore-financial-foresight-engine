// FORE — app/api/decide/route.ts
// Owner: TASK-005 (Allen, skeleton) / TASK-008 (Allen, chat UI wiring).
// Accepts a chat message, calls Groq/Llama 3.1 with tool-calling enabled, wires canIAfford().
// Dev GROQ_API_KEY only until TASK-012's rotation, per CONTRACT-008.
//
// Anti-hallucination rule (CONTRACT-004): the model must call canIAfford() before stating any
// day-shift number. The response includes `evidence.tool_calls` (the raw block from Groq's first
// response) so Testing & Verification can confirm the tool was genuinely called, not narrated.

import { NextRequest, NextResponse } from "next/server";
import { canIAffordToolDefinition, canIAfford } from "@/lib/tools/canIAfford";
import type { CanIAffordOutput } from "@/lib/tools/canIAfford";

// Override point exists only so wiring can be integration-tested against a local mock when no
// dev key is available; production always hits Groq directly.
const GROQ_CHAT_URL =
  (process.env.GROQ_API_BASE_URL ?? "https://api.groq.com/openai/v1") +
  "/chat/completions";
// Llama 3.1 per the locked stack. Overridable via env in case Groq renames/deprecates the slug.
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are FORE's DECIDE assistant. You help a user decide whether they can afford a purchase, grounded in their real financial data.

Rules — these are hard constraints, not suggestions:
1. If the user asks whether they can afford something (any purchase/affordability question), you MUST call the canIAfford tool. Never estimate, guess, or state any affordability verdict, day-shift, or zero-balance date yourself.
2. Only state numbers that came back from the canIAfford tool's return value. Quoting a number the tool did not return is forbidden.
3. If the message is NOT an affordability question (greetings, small talk, unrelated questions), do NOT call any tool. Just reply conversationally and briefly, and mention you can help them decide if they can afford something.
4. Amounts may be written in Indian formats (e.g. "₹15,000", "15k"). Normalize to a plain number for the tool call.
5. After the tool returns, narrate its result faithfully: the affordable verdict, the day_shift, the new_zero_balance_date, and the explanation. Do not embellish with numbers the tool did not provide.`;

interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  withTools: boolean
) {
  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      ...(withTools
        ? { tools: [canIAffordToolDefinition], tool_choice: "auto" as const }
        : {}),
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq API ${res.status}: ${detail.slice(0, 500)}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  let message: unknown;
  try {
    ({ message } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set (dev key, per CONTRACT-008)" },
      { status: 500 }
    );
  }

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  try {
    // Round-trip 1: let the model decide whether to call the tool.
    const first = await callGroq(apiKey, messages, true);
    const firstMessage: GroqMessage = first.choices[0].message;
    const toolCalls = firstMessage.tool_calls ?? [];

    if (toolCalls.length === 0) {
      // Not an affordability question — plain conversational reply, no tool.
      return NextResponse.json({
        reply: firstMessage.content ?? "",
        tool_called: false,
        verdict: null,
        evidence: { tool_calls: null },
      });
    }

    // Execute each canIAfford call (normally exactly one) and feed results back.
    messages.push(firstMessage);
    let verdict: CanIAffordOutput | null = null;

    for (const toolCall of toolCalls) {
      if (toolCall.function.name !== "canIAfford") {
        return NextResponse.json(
          { error: `model requested unknown tool: ${toolCall.function.name}` },
          { status: 502 }
        );
      }
      let args: { item?: string; amount?: number };
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        return NextResponse.json(
          { error: "model produced unparseable tool arguments" },
          { status: 502 }
        );
      }
      verdict = await canIAfford({
        item: args.item ?? "",
        amount: args.amount ?? 0,
        // TODO(TASK-008): pass the live financial_context's transactions here. The TASK-005
        // stub ignores them; TASK-007's real math (Render /can-i-afford) needs them.
        transactions: [],
      });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(verdict),
      });
    }

    // Round-trip 2: model narrates the tool's return value. No tools offered — the answer
    // already exists; a second tool call here would be spurious.
    const second = await callGroq(apiKey, messages, false);
    const reply: string = second.choices[0].message.content ?? "";

    return NextResponse.json({
      reply,
      tool_called: true,
      verdict,
      // Raw tool_calls block from Groq's first response — the Testing & Verification evidence
      // that the number came from a real function call, per CONTRACT-004.
      evidence: { tool_calls: toolCalls },
    });
  } catch (err) {
    // CONTRACT-006 error shape — never crash the chat UI on an upstream failure.
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
