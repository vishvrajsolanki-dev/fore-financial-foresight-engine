━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-005 — BACKEND (Allen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : [fill in]
Overall Task    : DECIDE chat route skeleton + Groq wiring + canIAfford() stub
Your Scope      : Next.js API route that accepts a chat message, calls Groq/Llama with tool-calling
                  enabled, and wires the canIAfford() tool definition. Stub the return value for now
                  — real math (calling Vishvraj's Python endpoint) is TASK-007/008.
Pairing note    : Solo this block — Kavya is paired with Vishvraj on TASK-004 this window instead,
                  since that's where the double-task load is in G1. You have exactly one task here.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This is the flagship feature's backbone. The anti-hallucination design is the whole point: the
  model must call the tool, never state a number itself. Get the tool-calling wiring correct before
  worrying about UI (TASK-008) or real math (TASK-007).

INTERFACE CONTRACT
  CONTRACT-004 (canIAfford, stub for now), CONTRACT-006 (HTTP contract to the Python service —
  confirm the shape with Vishvraj if TASK-003 hasn't settled it yet).

DEPENDENCIES
  Waiting on     : TASK-001
  You deliver to : TASK-008 (UI), TASK-007 (real math swaps in behind this same interface),
                   CHECKPOINT-1

CONSTRAINTS
  Groq API + Llama 3.1, real function-calling. Route under app/api/decide/. Calls out to Render via
  RENDER_ML_BASE_URL (CONTRACT-006) — this is now a genuine cross-origin HTTP call, not a co-located
  function, so use the same client module pattern for it that TASK-002 uses for pastClient.ts.
  Dev Groq key only — see CONTRACT-008, the fresh key is not touched until TASK-012.

ENVIRONMENT SETUP CHECK
  Confirm GROQ_API_KEY (dev) is set. Test a trivial tool-call round-trip (e.g. echo tool) before
  wiring canIAfford() — isolate "is tool-calling working at all" from "is my specific tool right."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git checkout main && git pull origin main
2. git checkout -b feat/BE-005-decide-route-skeleton
3. Never push directly to main
4. New dependency → pin exact version, record in CONTRACTS.md
5. Commit: feat(BE): TASK-005 <description>
6. git push -u origin feat/BE-005-decide-route-skeleton
7. git pull origin main --rebase before PR
8. Squash merge → delete branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. curl/Postman POST directly, no UI needed
2. Scenario: "Can I afford a ₹15,000 laptop next month?"
3. Expected: response includes evidence the tool was actually called (a tool_calls block in the raw
   Groq response), not just plausible-sounding text
4. Edge case: a message with no affordability question ("hi") — confirm no spurious tool call
5. No regression: N/A, first implementation
6. Evidence: pasted raw API response showing the tool_calls block, before PR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Route reliably triggers the tool call on affordability questions; stub return flows back into the
  model's narration correctly.

BRANCH / FILE OWNERSHIP
  Branch : feat/BE-005-decide-route-skeleton
  Files  : app/api/decide/route.ts, lib/tools/canIAfford.ts (stub)

ESCALATION PATH
  Blocked >20 min → Vishvraj (contract question) or Lead (Groq account issue)

KNOWN RISKS
  Model may narrate a number even when the tool wasn't called if the system prompt is loose — test
  the "hi" edge case specifically to catch over-eager tool use, and the real question to catch
  under-eager tool use.

CONFLICT WATCH
  TASK-008 (UI wraps this route), TASK-007 (replaces the stub's internal math behind the same shape)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
