"use client";

import { useEffect, useRef, useState } from "react";
import FaceIntro from "@/components/FaceIntro";
import { features } from "@/lib/features";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  toolCalled?: boolean;
  verified?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  "Can I afford a ₹15,000 laptop next month?",
  "Should I buy ₹5,000 headphones?",
  "Hi",
];

const SLOW_AFTER_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;

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

export default function DecideChat() {
  const { ctx, applyDecideVerdict } = useFinancialContext();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [listening, setListening] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = ctx?.session_id ?? null;

  useEffect(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setSlow(false);
    if (slowTimer.current) clearTimeout(slowTimer.current);
  }, [sessionId]);

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

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: q,
          transactions: ctx.transactions,
          history,
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
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error || "Something went wrong.", error: true },
        ]);
      } else {
        const verdict = data.verdict;
        const verified = !!(verdict && verdict.new_zero_balance_date);
        if (verified) applyDecideVerdict(verdict);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.reply,
            toolCalled: !!data.tool_called && verified,
            verified: data.verified !== false,
            error: !!data.tool_called && !verified,
          },
        ]);
        if (verified && data.reply) void narrateVerdict(data.reply);
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
    <div className="grid gap-4">
      <FaceIntro
        face="DECIDE"
        title="Ask if you can afford something — I run the real numbers."
        blurb="Every affordability answer comes from a live canIAfford() function call, never a guessed number."
      />

      <div className="card min-h-[16rem]">
        {messages.length === 0 ? (
          <p className="muted text-sm">No questions yet. Try one of the suggestions below.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
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
            aria-label="Voice input"
          >
            {listening ? "🎤…" : "🎤"}
          </button>
        )}
        <button
          className="btn shrink-0"
          type="submit"
          disabled={loading || !input.trim()}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
