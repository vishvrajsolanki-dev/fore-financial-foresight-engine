"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import FaceIntro from "@/components/FaceIntro";
import { features } from "@/lib/features";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  toolCalled?: boolean;
  verified?: boolean;
  error?: boolean;
  toolTrace?: { name: string; args?: unknown; result?: unknown }[];
  mathOpen?: boolean;
}

const SUGGESTIONS = [
  "Can I afford a ₹15,000 laptop next month?",
  "Should I buy ₹5,000 headphones?",
  "Hi",
];

const SLOW_AFTER_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;
const CONV_STORAGE_KEY = "fore_conversation_id";

async function narrateVerdict(text: string): Promise<void> {
  if (!features.voiceNarration) return;
  try {
    const res = await fetch("/api/voice/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch {
    /* optional feature */
  }
}

function formatToolTrace(trace: ChatMsg["toolTrace"]): string {
  if (!trace?.length) return "";
  return JSON.stringify(trace, null, 2);
}

export default function DecideChat() {
  const { ctx, applyDecideVerdict, fullStackEnabled, currency } = useFinancialContext();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = ctx?.session_id ?? null;
  const balance = ctx?.transactions?.reduce((s, t) => s + t.amount, 0) ?? null;

  useEffect(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setSlow(false);
    setConversationId(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CONV_STORAGE_KEY);
    }
    if (slowTimer.current) clearTimeout(slowTimer.current);
  }, [sessionId]);

  useEffect(() => {
    if (conversationId && typeof window !== "undefined") {
      sessionStorage.setItem(CONV_STORAGE_KEY, conversationId);
    }
  }, [conversationId]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading || !ctx) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setSlow(false);
    slowTimer.current = setTimeout(() => setSlow(true), SLOW_AFTER_MS);

    const history = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.text }));

    const storedConv =
      conversationId ||
      (typeof window !== "undefined" ? sessionStorage.getItem(CONV_STORAGE_KEY) : null);

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: q,
          history,
          ...(storedConv ? { conversation_id: storedConv } : {}),
          ...(fullStackEnabled
            ? {}
            : {
                transactions: ctx.transactions,
                financial_context: {
                  session_id: ctx.session_id,
                  persona: ctx.persona,
                  monthly_income: ctx.monthly_income,
                  archetype: ctx.archetype,
                  burn_rate: ctx.burn_rate,
                  goal: ctx.goal,
                  benchmark: ctx.benchmark,
                  last_decide_verdict: ctx.last_decide_verdict,
                },
              }),
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error || "Something went wrong.", error: true },
        ]);
      } else {
        if (data.conversation_id) setConversationId(data.conversation_id);

        const trace = Array.isArray(data.tool_trace) ? data.tool_trace : [];
        const afford = trace.find((t: { name?: string }) => t.name === "canIAfford") as
          | {
              name: string;
              args?: { item?: string; amount?: number };
              result?: { day_shift?: number; new_zero_balance_date?: string; amount?: number };
            }
          | undefined;
        const result = afford?.result;
        if (result?.new_zero_balance_date) {
          applyDecideVerdict({
            item: String(afford?.args?.item || "purchase"),
            amount: Number(afford?.args?.amount) || Number(result.amount) || 0,
            day_shift: Number(result.day_shift) || 0,
            new_zero_balance_date: result.new_zero_balance_date,
          });
        }
        const toolCalled = trace.length > 0;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.reply,
            toolCalled,
            verified: data.verified !== false,
            error: false,
            toolTrace: trace,
          },
        ]);
        if (toolCalled && data.reply) void narrateVerdict(data.reply);
      }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: timedOut
            ? "This is taking longer than expected — the affordability service didn't respond in time. Please try again in a moment."
            : "Couldn't reach the DECIDE service. Check your connection and try again.",
          error: true,
        },
      ]);
    } finally {
      clearTimeout(abortTimer);
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setSlow(false);
      setLoading(false);
    }
  }

  function toggleMath(index: number) {
    setMessages((msgs) =>
      msgs.map((m, i) => (i === index ? { ...m, mathOpen: !m.mathOpen } : m))
    );
  }

  function startVoiceInput() {
    if (!features.voiceInput || listening) return;
    type SpeechRec = {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    type SpeechRecCtor = new () => SpeechRec;
    const w = window as Window & {
      SpeechRecognition?: SpeechRecCtor;
      webkitSpeechRecognition?: SpeechRecCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Voice input isn't supported in this browser.", error: true },
      ]);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript ?? "";
      if (text) setInput(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }

  return (
    <div className="grid gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-start justify-between gap-3">
        <FaceIntro
          face="DECIDE"
          title="Ask if you can afford something — I run the real numbers."
          blurb="Every affordability answer comes from a live canIAfford() function call, never a guessed number."
        />
        <button type="button" className="btn-ghost btn text-sm shrink-0" onClick={() => setContextOpen(true)}>
          Context
        </button>
      </div>

      <div className="card min-h-[16rem]">
        {messages.length === 0 ? (
          <div className="py-6">
            <p className="display text-xl">What are you deciding?</p>
            <p className="muted text-sm mt-2">Try a suggestion below — answers stay grounded in your data.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}-${m.text.slice(0, 24)}`}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 rise-in ${
                  m.role === "user" ? "self-end bg-[var(--accent)] text-white" : "self-start"
                }`}
                style={
                  m.role === "assistant"
                    ? {
                        background: "var(--bg-soft)",
                        border: `1px solid ${m.error ? "var(--danger)" : "var(--border)"}`,
                      }
                    : undefined
                }
              >
                {m.role === "assistant" && m.toolCalled && (
                  <span className="pill mb-2">
                    ✓ checked your numbers
                    {features.selfVerify && m.verified === false ? " (review)" : ""}
                  </span>
                )}
                <p className="whitespace-pre-wrap text-sm sm:text-base">{m.text}</p>
                {m.role === "assistant" && m.toolTrace && m.toolTrace.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn-ghost text-xs px-2 py-1"
                      onClick={() => toggleMath(i)}
                    >
                      {m.mathOpen ? "Hide the math" : "Show the math"}
                    </button>
                    {m.mathOpen && (
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--card)] p-2 text-xs muted">
                        {formatToolTrace(m.toolTrace)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="self-start muted text-sm">
                {slow ? "Still checking your numbers…" : "Thinking…"}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="btn-ghost text-sm"
            onClick={() => ask(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="input"
          placeholder="Can I afford…?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          aria-label="Affordability question"
        />
        {features.voiceInput && (
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={startVoiceInput}
            disabled={loading || listening}
            aria-label={listening ? "Listening for voice input" : "Start voice input"}
            aria-pressed={listening}
          >
            <Mic size={18} strokeWidth={1.75} aria-hidden />
            <span className="sr-only sm:not-sr-only sm:inline text-sm">
              {listening ? "Listening…" : "Voice"}
            </span>
          </button>
        )}
        <button className="btn shrink-0" type="submit" disabled={loading || !input.trim()}>
          Ask
        </button>
      </form>

      {contextOpen && (
        <>
          <button
            type="button"
            className="decide-drawer-backdrop"
            aria-label="Close context"
            onClick={() => setContextOpen(false)}
          />
          <aside className="decide-drawer" aria-label="Financial context">
            <div className="flex items-center justify-between mb-4">
              <h2 className="display text-xl">Context</h2>
              <button type="button" className="btn-ghost btn text-sm" onClick={() => setContextOpen(false)}>
                Close
              </button>
            </div>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="muted text-xs uppercase font-semibold">Balance</dt>
                <dd className="tabular text-lg font-semibold mt-1">
                  {balance != null ? balance.toLocaleString() : "—"} {currency}
                </dd>
              </div>
              <div>
                <dt className="muted text-xs uppercase font-semibold">Daily burn</dt>
                <dd className="tabular text-lg font-semibold mt-1">
                  {ctx?.burn_rate?.daily_avg != null ? ctx.burn_rate.daily_avg.toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="muted text-xs uppercase font-semibold">Runway date</dt>
                <dd className="text-lg font-semibold mt-1">
                  {ctx?.burn_rate?.projected_zero_balance_date ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="muted text-xs uppercase font-semibold">Archetype</dt>
                <dd className="text-lg font-semibold mt-1">{ctx?.archetype?.label ?? "—"}</dd>
              </div>
            </dl>
            {!fullStackEnabled && (
              <p className="muted text-xs mt-6">Demo mode — context from your local session.</p>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
