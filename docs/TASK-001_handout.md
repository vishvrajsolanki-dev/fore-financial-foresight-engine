━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARK TASK HANDOUT
  TASK-001 — SETUP (ALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assigned By     : Lead
Assignee Skill  : N/A — whole team present
Overall Task    : Repo, rules, stack lock, deploy link (two targets)
Your Scope      : Create repo, write .cursor/rules, confirm the Python-on-Render stack decision in
                  writing, link Vercel project (Next.js), confirm the Render FastAPI service (should
                  already be provisioned during pre-kickoff prep — see STARK_TEAM_BRIEF.md), wire
                  CORS between the two domains, configure Vercel env vars for instant-propagation
                  flags (CONTRACT-007 depends on this setting).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT
  This 15-minute investment upgrades every task after it. Nothing else starts until this closes.
  Two deploy targets now exist on purpose (Vercel for Next.js, Render for the Python ML service) —
  see STARK_TEAM_BRIEF.md's tradeoff note for why. This task is where that tradeoff either pays off
  cleanly or causes problems all day — don't rush the CORS/warm-instance checks.

INTERFACE CONTRACT
  Confirms STACK DECISION block in CONTRACTS.md is filled in and true, not aspirational.
  Confirms CONTRACT-006's warm-up and CORS requirements are actually met, not assumed.

DEPENDENCIES
  Waiting on     : None (but Render account + repo link should exist from pre-kickoff prep)
  You deliver to : Every other task

CONSTRAINTS
  GitHub public repo (hackathon rule). Render service must be on an always-on tier, not a
  free/spin-down tier — confirm this explicitly, don't assume the pre-kickoff provisioning got it
  right. Vercel project holds only the Next.js app now, not Python functions.

ENVIRONMENT SETUP CHECK
  1. npx create-next-app@14 --typescript --tailwind --app
  2. Confirm the Render service (provisioned pre-kickoff) responds to a trivial GET /health
  3. Add CORS middleware on the FastAPI app allowing the Vercel domain specifically (not "*")
  4. Set RENDER_ML_BASE_URL on Vercel, redeploy, confirm the Next.js app can reach Render
  5. vercel link, confirm the Next.js side resolves on its own preview URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. git init, first commit, push to a new GitHub repo (public)
2. All subsequent work branches off main per the standard protocol in CONTRACTS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING & VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Hit Render's /health endpoint twice in a row from the Next.js app's own server (not just curl
   from your laptop) — confirm CORS doesn't block it and both calls return quickly
2. Scenario: second call should not be meaningfully slower than the first — this rules out
   spin-down risk before anyone builds real logic assuming an always-warm instance
3. Expected: both calls succeed, response times are close to each other, confirming the instance
   is genuinely always-on
4. Edge case: confirm env var change on Vercel propagates without a full redeploy (needed for
   CONTRACT-007's Tier 2 flags) — test by flipping a dummy flag and observing it live within 2 min
5. No regression: N/A, first setup
6. Evidence: pasted response + timing from both /health calls, and timestamp proving the env var
   propagated fast
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
  Next.js shell live on Vercel, Render ML service confirmed warm and CORS-reachable, .cursor/rules
  committed, stack decision confirmed in CONTRACTS.md.

BRANCH / FILE OWNERSHIP
  Branch : main (initial commit only, everything after this is branch+PR)
  Files  : .cursor/rules, vercel.json, api-client config pointing at RENDER_ML_BASE_URL

ESCALATION PATH
  Blocked >20 min → whole team stops, this is a hard gate

KNOWN RISKS
  If the Render instance turns out to be on a spin-down tier despite pre-kickoff prep, this is the
  moment to fix it — not TASK-003 or Checkpoint-1. A cold Render hit during the live demo is the
  single biggest risk this rework was meant to eliminate.

CONFLICT WATCH
  None yet — this task exists precisely to prevent later conflicts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this block into Cursor to begin — see CURSOR_IMPLEMENTATION_GUIDE.md.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
