# FORE — The Financial Foresight Engine
### Cursor Hackathon Ahmedabad · Domain: AI for Everyday Experiences
### Final build blueprint — 4-person team, 4.5-hour window, Cursor-native workflow

---

## 0. THE ONE-LINE PITCH

FORE looks at where your money actually went, lets you ask it — in plain language — whether you can afford something before you spend it, and shows you exactly how that decision moves your future, with the real number behind every answer.

Everyday personal finance apps show you a report and stop talking. FORE stays in the conversation: one shared understanding of your finances, three ways to reach it.

---

## 1. THE PRODUCT SHAPE — one spine, three faces

```text
                    ┌─────────────────────┐
                    │   SHARED DATA SPINE  │
                    │  financial_context:  │
                    │  archetype, burn     │
                    │  rate, income, cats  │
                    └──────────┬──────────┘
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
          PAST              DECIDE              AHEAD
     spending profile   ask before you buy   goal + benchmark
     + burn-rate model  grounded chat with   pace tracking vs
                        a real tool-call     peer percentile
```

Nothing in FORE stands alone. PAST computes the numbers DECIDE reasons over. A verdict from DECIDE updates the trajectory AHEAD is tracking against. One `financial_context` object, read and written by all three faces — not three demos wearing one login screen.

**Why this shape wins in a hackathon:** most teams under time pressure ship a pile of disconnected features. A judge can tell the difference between "here are three things we built" and "here is one system with three windows into it" within the first thirty seconds of a demo. The second is what FORE is built to be.

---

## 2. FEATURES

### 2.1 PAST — Spending Profile
- User uploads a transaction CSV (or picks a pre-loaded demo dataset for reliability on stage).
- Classifies the user into one of 5 spending archetypes (Disciplined Saver, Impulsive Spender, The Foodie, Social Butterfly, Balanced Spender) using distance-to-centroid classification — deterministic, explainable, and valid on a single data sample (no clustering algorithm needed, which matters because clustering methods require multiple samples to find groups and a single uploaded file is exactly one sample).
- Fits a burn-rate trend line to daily spend and projects a zero-balance date.
- Both outputs are written into the shared `financial_context` object that DECIDE and AHEAD read from.

### 2.2 DECIDE — Ask Before You Buy
- Chat interface. User asks a real hypothetical: *"Can I afford a ₹15,000 laptop next month?"*
- The model calls a real function, `canIAfford(item, amount)`, which recalculates the burn-rate trend with that expense inserted and returns the real day-shift in the projected crisis date.
- The model narrates that returned number — it never invents the math itself. This is the direct answer to "will this hallucinate on stage," and it's demonstrated happening live, not hidden.

### 2.3 AHEAD — Goal & Benchmark
- Single-session goal calculator: user sets a target amount + date, sees whether current pace hits it.
- Static peer-benchmark cohort (pre-built JSON across income brackets and city tiers) gives an instant percentile: *"You spend more on food than 80% of people in your bracket."*
- Both feed back into the same `financial_context` object DECIDE reasons over, so a DECIDE verdict and an AHEAD goal are never contradictory.

### 2.4 What's deliberately NOT built (and why that's a strength, not a gap)
| Cut | Reason | Say this on stage |
|---|---|---|
| Real bank account login / Plaid-style integration | No time to secure real financial credentials safely in 4.5h | "Structured to plug into a real transaction feed on adoption" |
| Persistent multi-user accounts, login/signup | No auth system is buildable alongside everything else in this window without real risk | "Single-session by design for the demo; the data model is already shaped for multi-user" |
| Long-horizon forecasting (e.g. seasonal models) | Demo dataset spans a few months — not enough signal for anything beyond a trend line to actually help | "A straight-line burn-rate projection, honestly labeled as one" |

Naming these cuts explicitly, before a judge asks, is itself part of the pitch.

---

## 3. FULL TECH STACK — finalized

The stack is chosen for one property above all others: **everything lives in one language, one repo, one deploy.** This isn't a taste preference — it's what lets an AI agent reason across the entire codebase at once instead of context-switching between a Python backend and a JS frontend, and it collapses two deployments into one.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router), TypeScript** | Frontend pages and backend API routes in one project, one deploy target, one language for the whole team and every agent session |
| Styling | **Tailwind CSS + shadcn/ui** | Fast to scaffold, looks intentional out of the box, no custom design system needed |
| Charts | **Recharts** | Radar chart for archetype, line chart for burn-rate/crisis projection |
| State / data | **In-memory server object**, no database | `financial_context` lives in a server-side module for the demo session; zero DB setup, zero migration risk |
| Math / classification | **Hand-rolled TypeScript** (Euclidean distance + linear regression via `simple-statistics`) | No second language, no Python environment to manage under time pressure |
| Chat / LLM | **Groq API + Llama 3.1** | Fast inference, real tool-calling support, generous free tier |
| Synthetic data | **Pre-built JSON generator script**, run once before the demo | Realistic transaction set + benchmark cohort, shipped as static files — zero runtime generation risk |
| Auth | **None** | Single hardcoded demo session — see §2.4 |
| Deployment | **Vercel**, single project | One command deploy (`vercel deploy`), preview URLs per push, no separate backend host |
| Version control | **GitHub**, public repo | Required by hackathon rules; also what Cursor's agent commits to directly |

---

## 4. HOW CURSOR CHANGES THE BUILD — and where the saved time goes

This section is the actual plan, not a footnote. The team is using Cursor, and Cursor's capabilities should decide *how* the 4.5 hours are spent, not just *that* they're spent faster.

### 4.1 What Cursor actually does, mapped to this build

| Cursor capability | What it does | Where it's used in FORE |
|---|---|---|
| **Tab completion** | Predicts multi-line completions from surrounding code and codebase conventions, not just the next token | The three near-identical tab components (PAST/DECIDE/AHEAD pages), the repeated API route boilerplate, the shared TypeScript types |
| **Cmd+K inline edit** | Select code, describe the change in plain English, get a reviewable diff | Fast, targeted fixes mid-build — adjusting a chart's props, renaming a field across a small block, tightening a prompt string |
| **Agent Mode** | Describe a feature in plain language; the agent plans, creates/edits multiple files, runs terminal commands, and iterates until done | Scaffolding each face of the app in one prompt each: "build the PAST page with an upload form, archetype classifier call, and a Recharts radar chart" generates the route, the component, and the API handler together |
| **Subagents / parallel agents** | Multiple agents run concurrently on independent subtasks, each with its own context | With 4 people, each can run their own agent on their slice (frontend shell, classifier + burn-rate function, chat + tool-call route, synthetic data + deploy) at the same time instead of waiting on each other |
| **Project rules file** (`.cursor/rules`) | A short file describing conventions once; every subsequent AI suggestion in chat, Tab, and Agent mode respects it | Written in the first 10 minutes: the exact shape of `financial_context`, naming conventions, "never fabricate a number — always call the real function" |
| **Terminal access in Agent mode** | The agent runs builds, installs, and deploy commands itself and reacts to the output | `npm install`, `next build`, `vercel deploy` run and self-corrected by the agent instead of manually watched |

### 4.2 Where the time actually gets reinvested

Reported gains across teams are in the 20-50% range on standard implementation work. Applied conservatively to a 4.5-hour window, that's realistically **60-90 minutes bought back** — not by cutting scope further, but by spending less wall-clock time on boilerplate, wiring, and repetitive typing. That time is not banked as slack; it is deliberately reinvested into the two things that separate a good hackathon build from a great one:

1. **More rehearsal and polish time** — an extra 20-30 minutes on the demo script and UI pass, which is what a judge actually notices in a 3-minute slot.
2. **A real integration buffer** — time to catch and fix the seams between PAST/DECIDE/AHEAD sharing one `financial_context` object, which is the one thing genuinely unique to this build and worth protecting.

The one caveat to hold onto throughout: agent output still needs a human diff review before accepting, especially in Agent Mode, which can occasionally change more than what was asked. Budget a few minutes per major agent run for this — it's built into the timeline below, not an afterthought.

---

## 5. REVISED TIMELINE (Cursor-aware)

| Time | Phase | What happens |
|---|---|---|
| 11:00–11:15 | **Setup** | Repo created, `.cursor/rules` written together (shared `financial_context` shape, conventions), Vercel project linked. This 15-minute investment upgrades every agent interaction afterward. |
| 11:15–12:15 | **Parallel build 1** | Each of the 4 people runs their own Agent Mode session on an independent slice: (1) Next.js shell + PAST page + upload flow, (2) classifier + burn-rate functions, (3) DECIDE chat route + `canIAfford()` tool-call, (4) synthetic data + benchmark JSON + first Vercel deploy of the empty shell |
| 12:15–12:45 | **Checkpoint 1 + review** | Merge branches, diff-review each agent's output together, confirm PAST is live end-to-end |
| 12:45–1:45 | **Parallel build 2** | (1) DECIDE chat UI, (2) AHEAD goal calculator UI + benchmark panel, (3) tool-call wiring + prompt tuning, (4) redeploy + error handling pass |
| 1:45–2:15 | **Checkpoint 2 + review** | Merge, diff-review, confirm all three faces read/write the same live `financial_context` |
| 2:15–2:50 | **Polish** | Styling pass via Cmd+K micro-edits, disclaimer line, loading states, edge-case handling |
| 2:50–3:15 | **Demo rehearsal** | Run the full one-minute pitch moment twice, time it, record a backup video |
| 3:15–3:30 | **Freeze** | No new code. Final deploy, final smoke test, standing by |

This leaves roughly **20-25 minutes of genuine slack** across the two parallel-build blocks, reserved for whatever an agent gets wrong on the first pass — treated as budgeted time, not a hidden risk.

---

## 6. TEAM SPLIT

| Track | Owns | Cursor usage |
|---|---|---|
| Frontend | Next.js shell, PAST/DECIDE/AHEAD pages, Recharts visualizations | Heaviest Tab + Agent Mode use for repeated component patterns |
| ML / logic | Archetype classifier, burn-rate regression, `canIAfford()` tool-call function | Plan Mode first for the tool-call logic (the most novel piece), then Agent Mode to implement |
| Chat / integration | Groq + Llama 3.1 wiring, prompt design, shared `financial_context` contract | Owns the `.cursor/rules` file; runs the agent that keeps all three faces contract-consistent |
| Data / infra / demo | Synthetic data + benchmark JSON, Vercel deploy, demo script | Runs terminal-facing agent tasks (deploy, build, smoke test) throughout, not just at the end |

---

## 7. RULES COMPLIANCE CHECK

- ✅ Built entirely using Cursor
- ✅ Public GitHub repo, commits throughout each parallel-build block (not one end-of-day commit)
- ✅ Deployed before final demo — in fact deployed from the first hour, redeployed at every checkpoint
- ✅ No feature implementation before the official 11:00 start; only the domain/idea decision and stack decision happen beforehand

---

## 8. THE DEMO MOMENT

```text
Live on stage: "Can I afford a ₹15,000 laptop next month?"
      │
      ▼
FORE calls canIAfford() — a real function, not a guess
      │
      ▼
"Yes, but your zero-balance date moves 11 days earlier."
      │
      ▼
"How does that compare to my goal?" → AHEAD panel shows the pace shift
      │
      ▼
"Is that normal?" → PAST/benchmark panel shows the percentile against peers
      │
      ▼
One question. Three faces. One real number behind every answer.
```

This sequence is the entire pitch in under a minute, and it's the moment every judging criterion — innovation, technical depth, effective AI use, completeness — gets demonstrated simultaneously rather than explained.

---

## 9. HONEST SCALABILITY CEILING (say this before a judge asks)

- The benchmark cohort is static and pre-baked for the demo — a real version needs an aggregated or opt-in anonymized dataset. Named as the first post-hackathon milestone, not hidden.
- Goals are single-session; real persistence needs an auth/session layer this build deliberately skips to stay inside 4.5 hours.
- The burn-rate model is a linear trend, honestly stated as such — no claim of forecasting accuracy beyond what a straight-line extrapolation provides.
