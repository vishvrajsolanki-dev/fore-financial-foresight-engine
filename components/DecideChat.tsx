// FORE — components/DecideChat.tsx
// Owner: TASK-008 (Allen). Chat UI wired to app/api/decide/route.ts.
// Must visibly show a "checked your numbers" indicator when the tool was called (trust signal).
// Must show a graceful "still checking" state past 2s (CONTRACT-006), never a silent hang.
// NOT in TASK-002/006 scope — styled placeholder only so the shell tab renders cleanly.

"use client";

export default function DecideChat() {
  // TODO(TASK-008): POST to /api/decide, render the response, show the tool-called indicator,
  // handle the 2s-graceful-wait state and Render-unreachable error path (CONTRACT-006).
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DECIDE</h1>
        <p className="mt-1 text-sm text-slate-400">
          &ldquo;Can I afford X?&rdquo; — answered by a real tool call, never a
          guessed number.
        </p>
      </div>
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
        Chat lands in TASK-008 (Allen) — wired to the canIAfford() tool call
        per CONTRACT-004.
      </div>
    </div>
  );
}
