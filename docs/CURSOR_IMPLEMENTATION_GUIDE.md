# FORE — CURSOR_IMPLEMENTATION_GUIDE.md
How one person takes their individual task handout and runs it to completion inside Cursor, using
STARK, while staying collision-free with the rest of the team. Read this once at kickoff — every
task owner follows the same loop.

---

## 1. What to load into Cursor before starting ANY task

Open Cursor on the FORE repo (already cloned locally, `main` pulled). Have these four files open or
referenced in every session — this is your full context, no re-explaining needed:

```
1. Your individual TASK-0XX_handout.md   — what you're building, right now
2. CONTRACTS.md                          — the shapes everything must match
3. STARK_TEAM_BRIEF.md                   — the roster, stack, tier system, timeline
4. This file (CURSOR_IMPLEMENTATION_GUIDE.md) — how to actually execute
```

**Mechanically, in Cursor:**
- `.cursor/rules` (written in TASK-001) is already picked up automatically by every Tab/Cmd+K/Agent
  interaction in this repo — you don't need to paste it manually each time.
- For your task handout + CONTRACTS.md: open both files in tabs, or `@`-reference them directly in
  your first Agent Mode prompt (Cursor's `@file` syntax pulls a file's content into context). Doing
  this once at the start of a task session is enough — Cursor's agent retains it for the session.
- Paste your handout's full block as your first message to the agent. This is intentional — STARK's
  handout format IS the prompt. Nothing needs translating.

---

## 2. How STARK's mode logic runs inside Cursor, phase by phase

Your handout already encodes STARK's Mode 2/3 structure. Here's how each section maps to a Cursor
action:

| Handout section | Cursor action |
|---|---|
| CONTEXT + INTERFACE CONTRACT | Read-only — this is what you tell the agent before asking for code. Paste it as-is in your first prompt so the agent doesn't guess a shape that conflicts with CONTRACTS.md. |
| DEPENDENCIES | Before starting, `git pull origin main` and check the dependency's branch is actually merged. Don't trust the task board alone — verify the file exists in `main`. |
| ENVIRONMENT SETUP CHECK | Run this FIRST, manually or via Agent Mode's terminal access, before asking the agent to write feature code. Isolate "is my environment working" from "is my code working" — don't debug both at once. |
| The actual build | **Agent Mode** for anything multi-file (a new page, a new API route, a new endpoint) — describe the deliverable in plain language, referencing the handout's CONSTRAINTS section explicitly so the agent doesn't invent a different pattern than the rest of the team. **Cmd+K** for small, targeted edits inside a single function (adjusting a prop, renaming a field to match CONTRACTS.md exactly, tightening a prompt string). |
| TESTING & VERIFICATION | Run every numbered step for real — curl commands, npm run dev clicks, edge cases — via Cursor's integrated terminal. Do not mark a step done from reading the code and judging it "looks right." Paste the actual output back into the chat so the agent (and you) can catch a mismatch against the expected result. |
| MANDATORY notes (Placeholder Replacement, etc.) | Write these by hand into your Session Log — don't let the agent paraphrase this section, it's a contract document other people rely on verbatim. |
| GIT PROTOCOL | See Section 3 below — this runs through Cursor's terminal, step by step, not skipped. |

**Cursor capabilities this maps to, concretely** (per your team brief's stack, mid-2026 Cursor):
- **Agent Mode** plans, edits multiple files, and runs terminal commands itself — this is your main
  driver for anything the handout's DELIVERABLE section describes as more than one file.
- **Tab completion** picks up the repeated patterns across the three faces (PAST/DECIDE/AHEAD share
  structure) — let it suggest the boilerplate, review before accepting.
- **Parallel/background agents** — if you're pairing (Allen+Kavya on TASK-004/005 or TASK-008/009),
  each of you runs your own Agent Mode session on your own branch simultaneously. Don't share one
  Cursor window for two people's work — that's what branches are for.
- **Terminal-in-agent-mode** — let the agent run `npm install`, `vercel dev`, `curl`, `pytest`/
  equivalent itself and react to the output, rather than you copy-pasting commands manually.

**The one caveat that applies to every task, no exceptions:** agent output still needs a human diff
review before you accept it or commit it — Agent Mode can occasionally change more than what was
asked. Read the diff. This is not optional, and it's why every handout's Testing & Verification
section asks for pasted evidence, not just "done."

---

## 3. Git collaboration through Cursor — step by step

Every handout's GIT PROTOCOL section is identical in shape. Here's how to actually run it inside
Cursor's terminal (Agent Mode can execute these directly if you ask it to, or you type them
yourself in the integrated terminal — either is fine, just don't skip a step):

```bash
# 1. Start clean
git checkout main && git pull origin main

# 2. Branch per your handout's exact name
git checkout -b feat/BE-005-decide-route-skeleton   # example — use YOUR handout's branch name

# 3. Build (Agent Mode / Cmd+K, per Section 2 above)

# 4. Commit in the required format
git add .
git commit -m "feat(BE): TASK-005 wire Groq tool-calling skeleton"

# 5. Push
git push -u origin feat/BE-005-decide-route-skeleton

# 6. Before opening a PR, rebase onto the latest main — this is where conflicts surface
git pull origin main --rebase
```

**If step 6 shows a conflict:**
1. Cursor will show the conflicted file(s) with standard `<<<<<<<` markers.
2. Check CONFLICT WATCH in your handout first — it names which other task is most likely to touch
   the same file. If that task's owner is online, resolve together rather than guessing their intent.
3. You can ask Cursor's Agent Mode to help resolve — paste the conflicted section and both tasks'
   handouts, ask it to reconcile against CONTRACTS.md's locked shape (not against either branch's
   convenience). The contract is the tiebreaker, not whoever committed first.
4. After resolving: `git add <file>`, `git rebase --continue`, then push again
   (`git push --force-with-lease` after a rebase, since history changed).

**Opening the PR:** through GitHub directly (web or `gh pr create` in Cursor's terminal). Reference
your TASK-ID in the PR title. Whoever reviews checks your Testing & Verification evidence is actually
pasted, not just described.

**After merge:** squash merge, delete the branch (`git branch -d <branch>` locally, GitHub handles
remote deletion on squash-merge if configured, otherwise `git push origin --delete <branch>`).

---

## 4. Placeholder swaps through Cursor (TASK-002 / TASK-003 specifically)

This build has exactly one live placeholder swap — PLACEHOLDER-A. Here's how it runs mechanically:

1. Drashti builds TASK-002 against the hardcoded PLACEHOLDER-A object, isolated to
   `lib/api/pastClient.ts` per her handout's constraint.
2. Vishvraj finishes TASK-003, writes the **PLACEHOLDER REPLACEMENT NOTE** into his PR description
   or a shared session log — not just in his own head.
3. At Checkpoint-1, Drashti opens `lib/api/pastClient.ts` in Cursor, pastes Vishvraj's replacement
   note into an Agent Mode prompt: "replace the hardcoded PLACEHOLDER-A object in this file with
   real fetch calls to /api/ml/classify and /api/ml/burn-rate, per this note: [paste note]."
4. Agent Mode makes the swap in that one file. Drashti reviews the diff, re-runs her handout's
   Testing & Verification steps against the real endpoint, confirms no regression.
5. This is a small follow-up commit on her existing branch (or a fresh tiny branch if hers already
   merged) — not a new task, not a new handout.

Every other Tier 1 dependency in this build is sequenced so the real thing exists before its
consumer starts — this swap is the only one that needs this dance, precisely because TASK-002 and
TASK-003 run in the same parallel block.

---

## 5. Tier 2 fail-safe, executed through Cursor

Per CONTRACT-007. When pulling a Tier 2 item:

1. `git checkout main && git pull origin main`
2. `git checkout -b feat/<domain>-TIER2-0X-<slug>`
3. Build behind `process.env.NEXT_PUBLIC_FEATURE_<NAME>` — Agent Mode can wire this conditional for
   you, ask explicitly: "gate this feature behind an env flag, default false, matching the pattern
   in CONTRACT-007."
4. `vercel` (no `--prod`) deploys a **preview URL** for this branch specifically — test the feature
   there, with the flag manually flipped on for that preview environment only.
5. Only after the preview test passes: open the PR, merge to main, flip the flag to `true` in
   Production env vars on Vercel's dashboard, confirm it propagates without a redeploy (verified
   working in TASK-001).
6. If Checkpoint-quality regression appears on the main demo URL after this merge: flip the flag
   back to `false` in the Vercel dashboard immediately. This is faster than any git operation — use
   it as the first response, always.

---

## 6. Quick reference — what each person actually pastes into Cursor to start their day

**Allen, starting TASK-005:**
```
@TASK-005_handout.md @CONTRACTS.md
I'm starting TASK-005. Confirm my environment setup check passes, then help me build the DECIDE
route skeleton per the handout's scope, constraints, and interface contract.
```

**Vishvraj, starting TASK-003:**
```
@TASK-003_handout.md @CONTRACTS.md
I'm starting TASK-003. Let's lock the centroid vectors first per the handout's context, then build
both endpoints. Remember I need to issue a Placeholder Replacement Note for PLACEHOLDER-A when done.
```

**Drashti, at Checkpoint-1 (placeholder swap):**
```
@TASK-002_handout.md @CONTRACTS.md
Vishvraj's Placeholder Replacement Note for PLACEHOLDER-A: [paste note]
Swap lib/api/pastClient.ts from the hardcoded placeholder to real fetch calls per this note, then
walk me through re-running my Testing & Verification steps against the real endpoint.
```

Same pattern for every task — handout + contracts, stated plainly, then let Agent Mode do the
multi-file work while you review every diff before accepting.

---

## 7. Working across two deploy targets (Vercel + Render)

TASK-001 introduced a second deploy target. Practically, this means:

- **Vercel CLI** (`vercel dev`, `vercel --prod`) still drives the Next.js side exactly as before.
- **Render** deploys are typically git-push-triggered (connect the repo once in TASK-001's
  pre-kickoff prep, then every push to `main` on the Python service's directory auto-deploys) —
  confirm this is configured rather than assuming it, since a manual-deploy Render service that
  nobody remembers to redeploy is a worse failure mode than the cold-start risk it was meant to fix.
- When Agent Mode is editing the Python service, tell it explicitly which directory maps to Render
  (e.g. `ml-service/`) so it doesn't intermix Next.js API route conventions with the FastAPI service.
- CORS errors show up in the browser console, not the terminal — when debugging a Vercel↔Render
  call that "does nothing," check the browser console first, not just server logs.

## 8. Credits in this build, and where each API key goes

Keep all of these as env vars, never hardcoded, per the same discipline as `GROQ_API_KEY`:
```
RENDER_ML_BASE_URL      — set on Vercel, points at the Render service (CONTRACT-006)
GROQ_API_KEY            — dev key through rehearsal, rotated in TASK-012 (CONTRACT-008)
ELEVENLABS_API_KEY      — only needed if TIER2-11 is pulled (CONTRACT-009)
EXA_API_KEY             — only needed if TIER2-12 is pulled (CONTRACT-010)
```
**Flow** (voice dictation) isn't an env var or an API key wired into FORE at all — it's a personal
app running on whoever's laptop, for talking through a long Agent Mode prompt instead of typing it.
It has nothing to do with the product and nothing to configure in the repo.

**Cursor Pro credit** doesn't require any specific action either — it just means the team doesn't
need to ration parallel Agent Mode sessions during pairing blocks (TASK-004 and TASK-009). Run them
freely.
