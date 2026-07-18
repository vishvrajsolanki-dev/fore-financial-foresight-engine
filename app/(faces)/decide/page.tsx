// FORE — app/(faces)/decide/page.tsx
// Owner: TASK-008 (Allen). Chat UI wired to app/api/decide/route.ts (TASK-005).
// This is the flagship demo moment — the model calling canIAfford() live.

import DecideChat from "@/components/DecideChat";

export default function DecidePage() {
  return <DecideChat />;
}
