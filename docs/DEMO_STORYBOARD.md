# FORE Demo Storyboard

Marketing trailer brief for desktop and mobile demos (60–120 seconds).  
**Goal:** A LinkedIn viewer understands the product, its value, and its standout capabilities — not a feature tour or QA walkthrough.

---

## Unique Selling Proposition

**One line:** FORE turns real transactions into foresight — ask “Can I afford this?” and get a live `canIAfford()` answer (not an LLM guess), then see how that purchase shifts runway and goals across Past, Decide, and Ahead.

**Problem:** Everyday money apps show a report and stop. People still can’t get a trustworthy answer to the question they actually ask before spending: *Can I afford this — and what does it do to my future?*

**Close tagline:** *One question. Three faces. One real number behind every answer.*

---

## Ideal user journey (spine)

```text
Landing (brand) → Use demo data → PAST (runway + archetype)
  → DECIDE (laptop question + verified math)
  → AHEAD (goal pace + peer bars)
  → Close on brand + tagline
```

**Flagship question:** *Can I afford a ₹15,000 laptop next month?*

**Recording mode:** Demo mode (`DATABASE_URL` unset). No register/login. Inline ML is enough; Groq is optional (fallback still runs real `canIAfford()` math).

---

## What to showcase

| # | Beat | Why it sells | Primary UI |
|---|------|--------------|------------|
| 1 | Landing brand + problem | Brand-first hook | `app/page.tsx` |
| 2 | Use demo data | Instant value, zero friction | `app/onboarding/page.tsx` → Priya persona |
| 3 | PAST runway + archetype + balance chart | “Sees my money” | `components/PastPanel.tsx` |
| 4 | DECIDE verified affordability | **Core USP / wow** | `components/DecideChat.tsx` |
| 5 | AHEAD pace + Decide impact + peers | Decision → future | `GoalPanel.tsx`, `BenchmarkPanel.tsx` |

## What to skip on camera

Login/register, Settings, Reports, CSV upload friction, Insights (optional 2s B-roll only), Pricing/Features marketing pages, admin/dev tools, long form-filling.

---

## Desktop storyboard (~90–110s)

Shoot at **1440×900** (or 1920×1080). Cut fast between faces; linger only on the verified Decide reply.

| Time | Scene | On screen | VO / on-screen text | Why someone chooses FORE |
|------|-------|-----------|---------------------|---------------------------|
| 0–3s | Logo / landing | `/` — FORE brand (accent on **O**) | Soft brand sting | Recognizable product |
| 3–12s | Problem | Hold hero: *See your financial future clearly* + product mock | “Money apps show what you spent. They don’t answer: can I afford the next buy?” | Stakes |
| 12–22s | Enter product | `/onboarding` → **Use demo data** → land on Past | “Start with demo data — no setup.” | Zero friction |
| 22–38s | PAST | Runway / zero-balance date, archetype label, balance line with projected ₹0 | “FORE reads your spend: runway, archetype, burn.” | Trust in the data |
| 38–70s | DECIDE (USP) | Suggestion or type laptop question → reply with day-shift → **✓ checked your numbers** → brief **Show the math** | “Ask before you buy. A real function — not a guess.” | Differentiator |
| 70–95s | AHEAD + use case | Goal pace / Recent DECIDE verdict + one peer percentile bar | “See how that purchase moves your goal — and how you compare.” | Outcome / foresight |
| 95–110s | Close | Past or landing mock + FORE mark | *One question. Three faces. One real number behind every answer.* | Memorable close |

### Desktop VO script (approx.)

1. “FORE — foresight for everyday money decisions.”
2. “Most apps stop at the statement. FORE answers the question you actually ask.”
3. “Load your transactions — or try demo data in one tap.”
4. “Past shows your runway and spending profile.”
5. “Decide: can I afford a fifteen-thousand-rupee laptop? FORE runs real math on your numbers.”
6. “Ahead shows how that choice shifts your goals — and how you stack up against peers.”
7. “One question. Three faces. One real number. FORE.”

---

## Mobile storyboard (~75s)

Same product story, tighter. Shoot at **~390×844**. Use the bottom tab bar (`AppShell`). Do **not** replicate every desktop beat.

| Time | Scene | Focus | Notes |
|------|-------|-------|-------|
| 0–3s | Brand | Landing or in-app FORE mark | Brand first |
| 3–10s | Demo data | One tap into product | Skip register |
| 10–25s | PAST | Runway date + archetype | Minimal scroll |
| 25–55s | DECIDE | Suggestion chip → verified badge | Skip “Show the math” expand |
| 55–70s | AHEAD | Pace pill + one benchmark bar | Thumb-speed |
| 70–75s | Close | Tab bar + brand / tagline | End on product chrome |

### Mobile VO cues

Keep VO shorter: problem → Decide wow → Ahead impact → tagline. Let UI motion carry Past.

---

## Recording philosophy

- Trailer, not tutorial.
- Every scene answers: **Why would someone choose this product?**
- Prioritize: differentiators, visual appeal, pacing, wow moments, value delivered.
- Avoid: settings tours, long forms, admin dashboards, rarely used features, implementation details unless they *are* the USP (live tool-backed math).

---

## Phase 3 — featured workflow verification

Verify **only** workflows that appear in the video. Demo mode: `npm run dev` with **no** `DATABASE_URL`.

| # | Workflow | Pass criteria | Result |
|---|----------|---------------|--------|
| 1 | Landing | `/` shows FORE hero + product visual | **pass** |
| 2 | Demo data → Past | Onboarding → Use demo data → `/past` shows runway + chart | **pass** |
| 3 | Decide USP | Laptop question → assistant reply + “✓ checked your numbers” (retry once) | **pass** (attempt 1) |
| 4 | Ahead | Goal/pace UI; Decide impact if verdict applied | **pass** |
| 5 | Mobile chrome | ~390px width: bottom tabbar; Past/Decide/Ahead usable | **pass** |

**On failure after one retry:** mark that beat *skip in recording* and keep the remaining spine.

**Out of scope:** Settings, Reports, Insights edge cases, auth, CSV upload, full `test:all`.

### Verification log

Smoke-verified locally with Playwright against `http://127.0.0.1:3000` (demo mode).

| # | Status | Notes |
|---|--------|-------|
| 1 | pass | FORE brand + hero headline (“See your financial future clearly”) visible |
| 2 | pass | Use demo data → `/past`; runway/archetype copy + chart SVG present |
| 3 | pass | Laptop suggestion → “✓ checked your numbers” on first attempt |
| 4 | pass | Goal/pace or peer benchmark UI visible on `/ahead` |
| 5 | pass | `.mobile-tabbar` visible at 390×844; Past/Decide/Ahead routes load |

**Verified:** 2026-07-20 — all five featured workflows **pass**; none marked skip.  
**Environment:** demo mode (no `DATABASE_URL`), inline ML, `npm run dev` on `:3000`

---

## Recordings (storyboard trailer)

Recorded with [`scripts/record_storyboard_demo.ts`](../scripts/record_storyboard_demo.ts) against local demo mode.

```bash
# Terminal 1 — demo mode (no DATABASE_URL)
unset DATABASE_URL && npm run dev

# Terminal 2
npx playwright install chromium   # once
DEMO_BASE_URL=http://127.0.0.1:3000 npm run record:storyboard
```

Artifacts (agent run): `/opt/cursor/artifacts/demo-storyboard/`

| Asset | Duration | Notes |
|-------|----------|-------|
| `fore-demo-desktop.mp4` / `.webm` | ~78s @ 1440×900 | Landing → demo → Past → Decide (math) → Ahead → close |
| `fore-demo-mobile.mp4` / `.webm` | ~57s @ 390×844 | Same spine; tab bar; no math expand |
| `desktop-*.png` / `mobile-*.png` | — | Keyframe stills per beat |
| `demo-meta.json` | — | Paths + timestamp |

**Recorded:** 2026-07-20 — USP beat includes “✓ checked your numbers” + laptop day-shift on both cuts.
