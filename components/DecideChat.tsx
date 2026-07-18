// FORE — components/DecideChat.tsx
// Owner: TASK-008 (Allen). Chat UI wired to app/api/decide/route.ts.
// Must visibly show a "checked your numbers" indicator when the tool was called (trust signal).
// Must show a graceful "still checking" state past 2s (CONTRACT-006), never a silent hang.

"use client";

import { useState } from "react";

export default function DecideChat() {
  const [messages, setMessages] = useState<string[]>([]);

  // TODO(TASK-008): POST to /api/decide, render the response, show the tool-called indicator,
  // handle the 2s-graceful-wait state and Render-unreachable error path (CONTRACT-006).

  return <div>DECIDE — TASK-008 not yet implemented</div>;
}
