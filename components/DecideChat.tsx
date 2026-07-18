// FORE — components/DecideChat.tsx
// Owner: TASK-008 (Allen). Chat UI wired to app/api/decide/route.ts.
// Shows a "checked your numbers" badge when the tool was actually called (trust signal), and a
// graceful "still checking" state past 2s (CONTRACT-006), never a silent hang. Writes each verdict
// back into the shared financial_context so AHEAD reflects it.
// TASK-010: face-intro consistency, mobile form polish, clear chat on persona switch.

"use client";

import { useEffect, useRef, useState } from "react";
import FaceIntro from "@/components/FaceIntro";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  toolCalled?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  "Can I afford a ₹15,000 laptop next month?",
  "Should I buy ₹5,000 headphones?",
  "Hi",
];

// CONTRACT-006: past 2s show a graceful "still checking" state; never a silent hang. We also cap
// the browser request itself so a stalled route/network surfaces to the user instead of spinning
// forever — the affordability call underneath already has its own 5s server-side timeout, this is
// the outer ceiling for the whole round-trip (two LLM hops + the tool call).
const SLOW_AFTER_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;

export default function DecideChat() {
  const { ctx, applyDecideVerdict } = useFinancialContext();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = ctx?.session_id ?? null;

  // Edge case: switching persona mid-chat must not leave the previous persona's thread on screen.
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

    // Send prior turns so a contextual follow-up ("what about ₹5,000 instead?") re-runs the tool
    // against the right item instead of losing the thread. Error bubbles are excluded.
    const history = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.text }));

    // Abort a stalled request so the UI never hangs silently (CONTRACT-006).
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        // A verdict is only trustworthy if the tool actually returned a real projection. If the
        // calculation service was unreachable the route still replies (graceful, no crash) but with
        // an empty date — in that case we must NOT flash the "checked your numbers" trust badge and
        // must NOT write the empty number back into the shared context (CONTRACT-001 / CONTRACT-004).
        const verdict = data.verdict;
        const verified = !!(verdict && verdict.new_zero_balance_date);
        if (verified) applyDecideVerdict(verdict);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.reply,
            toolCalled: !!data.tool_called && verified,
            error: !!data.tool_called && !verified,
          },
        ]);
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
                  <span
                    className="pill mb-2"
                    style={{
                      color: "var(--accent-2)",
                      borderColor: "rgba(52,211,153,.4)",
                      background: "rgba(52,211,153,.12)",
                    }}
                  >
                    ✓ checked your numbers
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
