import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { chatTools, executeTool, type ToolContext } from "@/lib/chat/tools";
import { verifyReplyAgainstTools } from "@/lib/chat/verifyReply";
import {
  loadSessionTransactions,
  sessionToSpine,
  patchSessionContext,
} from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/llm/provider";
import { actorKey, rateLimit } from "@/lib/security/rateLimit";
import { canIAffordMath } from "@/lib/ml/canIAfford";
import type { Transaction } from "@/types/financialContext";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseToolArgs(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function hasLlmConfigured(): boolean {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  if (provider === "ollama" || provider === "lmstudio") return true;
  return !!process.env.GROQ_API_KEY?.trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let toolCtx: ToolContext | null = null;
  let conversationId: string | null =
    typeof body?.conversation_id === "string" ? body.conversation_id : null;
  let userId: string | null = null;

  if (isDatabaseConfigured()) {
    const auth = await requireAuth(req);
    if (!isAuthPayload(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    userId = auth.sub;
    const spine = await sessionToSpine(auth.sid, auth.sub);
    const transactions = await loadSessionTransactions(auth.sid, auth.sub);
    if (!spine || transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions in your session — upload a bank CSV on PAST first." },
        { status: 400 }
      );
    }
    toolCtx = {
      userId: auth.sub,
      sessionId: auth.sid,
      transactions,
      spine: {
        monthly_income: spine.monthly_income,
        income_bracket: spine.income_bracket,
        city_tier: spine.city_tier,
        goal: spine.goal,
        burn_rate: spine.burn_rate,
        benchmark: spine.benchmark,
        archetype: spine.archetype,
      },
    };

    if (!conversationId) {
      const conv = await prisma.conversation.create({
        data: {
          userId: auth.sub,
          sessionId: auth.sid,
          title: message.slice(0, 80),
        },
      });
      conversationId = conv.id;
    } else {
      const owned = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: auth.sub },
      });
      if (!owned) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }

    await prisma.conversationMessage.create({
      data: { conversationId, role: "user", content: message },
    });
  } else {
    const transactions: Transaction[] = Array.isArray(body?.transactions) ? body.transactions : [];
    if (!transactions.length) {
      return NextResponse.json({ error: "Upload a bank CSV on PAST first." }, { status: 400 });
    }
    const fc = body?.financial_context && typeof body.financial_context === "object" ? body.financial_context : {};
    toolCtx = {
      userId: "demo",
      sessionId: String(fc.session_id || "demo"),
      transactions,
      spine: {
        monthly_income: Number(fc.monthly_income) || 60000,
        goal: fc.goal ?? null,
        burn_rate: fc.burn_rate ?? null,
        benchmark: fc.benchmark ?? null,
        archetype: fc.archetype ?? null,
      },
    };
  }

  if (!toolCtx) {
    return NextResponse.json({ error: "Context unavailable" }, { status: 500 });
  }

  const limited = await rateLimit({
    key: actorKey(req, "chat", userId),
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const system = `You are FORE's financial assistant. You MUST call tools for any number you state.
Never invent affordability, spend totals, burn rate, or goal math.
Benchmark peers are modeled/synthetic — disclose that when citing them.
Be concise. Tools available: ${chatTools.map((t) => t.function.name).join(", ")}.
Spine summary: ${JSON.stringify({
    persona: toolCtx.spine.archetype?.label,
    monthly_income: toolCtx.spine.monthly_income,
    burn_rate: toolCtx.spine.burn_rate,
    goal: toolCtx.spine.goal,
  })}`;

  const toolTrace: { name: string; args: unknown; result: unknown }[] = [];

  if (!hasLlmConfigured()) {
    const amountMatch = message.match(/₹?\s?([\d,]+(?:\.\d+)?)/);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
    const item = message.replace(/can i afford/i, "").trim() || "this purchase";
    const result =
      amount > 0
        ? canIAffordMath(item, amount, toolCtx.transactions)
        : { note: "Ask e.g. 'Can I afford a ₹15,000 laptop?'" };
    toolTrace.push({ name: amount > 0 ? "canIAfford" : "none", args: { item, amount }, result });
    const reply =
      amount > 0 && result && "explanation" in result
        ? String((result as { explanation: string }).explanation)
        : "I can run affordability math when the LLM is unset — include an amount in your question.";
    if (conversationId && isDatabaseConfigured()) {
      await prisma.conversationMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content: reply,
          toolPayload: toolTrace as Prisma.InputJsonValue,
        },
      });
    }
    return NextResponse.json({
      reply,
      tool_trace: toolTrace,
      conversation_id: conversationId,
      verified: true,
    });
  }

  try {
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const messages = [
      { role: "system" as const, content: system },
      ...history.map((t: { role: "user" | "assistant"; content: string }) => ({
        role: t.role,
        content: t.content,
      })),
      { role: "user" as const, content: message },
    ];

    let rounds = 0;
    let finalText = "";
    while (rounds < 3) {
      rounds++;
      const completion = await chatCompletion({
        messages,
        tools: chatTools,
      });

      if (completion.tool_calls?.length) {
        messages.push({
          role: "assistant",
          content: completion.content || "",
          tool_calls: completion.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });
        for (const call of completion.tool_calls) {
          const name = call.function.name;
          const args = parseToolArgs(call.function.arguments);
          const executed = await executeTool(name, args, toolCtx);
          const payload = executed.ok ? executed.result : { error: executed.error };
          toolTrace.push({ name, args, result: payload });
          if (name === "canIAfford" && executed.ok && payload && typeof payload === "object") {
            const v = payload as {
              day_shift?: number;
              new_zero_balance_date?: string;
              amount?: number;
            };
            if (isDatabaseConfigured() && toolCtx.userId !== "demo") {
              await patchSessionContext(toolCtx.sessionId, toolCtx.userId, {
                lastDecideVerdict: {
                  item: String((args as { item?: string }).item || "item"),
                  amount: Number((args as { amount?: number }).amount) || 0,
                  day_shift: Number(v.day_shift) || 0,
                  new_zero_balance_date: String(v.new_zero_balance_date || ""),
                },
              });
            }
          }
          messages.push({
            role: "tool",
            content: JSON.stringify(payload),
            tool_call_id: call.id,
          });
        }
        continue;
      }
      finalText = completion.content || "I need a tool result to answer with numbers.";
      break;
    }

    const verified = verifyReplyAgainstTools(finalText, toolTrace);
    if (!verified) {
      finalText +=
        "\n\n(Self-check: re-run the numbers if this looks off — the underlying tool math is still real.)";
    }

    if (conversationId && isDatabaseConfigured()) {
      await prisma.conversationMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content: finalText,
          toolPayload: toolTrace as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      reply: finalText,
      tool_trace: toolTrace,
      conversation_id: conversationId,
      verified,
    });
  } catch (err) {
    console.error("Chat error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Chat service temporarily unavailable" }, { status: 502 });
  }
}
