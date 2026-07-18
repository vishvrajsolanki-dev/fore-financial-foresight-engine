// FORE — components/DecideChat.tsx
// Owner: TASK-008 (Allen). Chat UI wired to app/api/decide/route.ts.
// Shows a "checked your numbers" badge when the tool was actually called (trust signal), and a
// graceful "still checking" state past 2s (CONTRACT-006), never a silent hang. Writes each verdict
// back into the shared financial_context so AHEAD reflects it.

"use client";

import { useRef, useState } from "react";
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

export default function DecideChat() {
  const { ctx, applyDecideVerdict } = useFinancialContext();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading || !ctx) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setSlow(false);
    slowTimer.current = setTimeout(() => setSlow(true), 2000);

    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, transactions: ctx.transactions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error || "Something went wrong.", error: true },
        ]);
      } else {
        if (data.verdict) applyDecideVerdict(data.verdict);
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.reply, toolCalled: !!data.tool_called },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Couldn't reach the DECIDE service. Check your connection and try again.",
          error: true,
        },
      ]);
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setSlow(false);
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="card">
        <p className="muted text-sm">DECIDE</p>
        <p className="text-lg font-semibold mt-1">
          Ask if you can afford something — I run the real numbers.
        </p>
        <p className="muted text-sm mt-1">
          Every affordability answer comes from a live <code>canIAfford()</code> function call, never
          a guessed number.
        </p>
      </div>

      <div className="card min-h-[16rem]">
        {messages.length === 0 ? (
          <p className="muted">No questions yet. Try one of the suggestions below.</p>
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
                  <span className="pill mb-2" style={{ color: "var(--accent-2)", borderColor: "rgba(52,211,153,.4)", background: "rgba(52,211,153,.12)" }}>
                    ✓ checked your numbers
                  </span>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
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
          <button key={s} className="btn-ghost text-sm" onClick={() => ask(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
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
        />
        <button className="btn" type="submit" disabled={loading || !input.trim()}>
          Ask
        </button>
      </form>
    </div>
  );
}
