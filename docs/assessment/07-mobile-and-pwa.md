# 07 — Mobile Compatibility Audit & Roadmap

## Part A — Audit

The app is responsive-aware (Tailwind `sm:`/`md:`/`lg:` utilities throughout; no custom
breakpoints — `tailwind.config.ts` has an empty `theme.extend`) but was designed
desktop-first for a stage demo.

### Responsive CSS in use

| Pattern | Where |
|---------|-------|
| `sm:px-6`, `sm:py-8`, `sm:p-6` shell padding | `.app-shell`/topbar classes in `app/globals.css` |
| `sm:text-2xl` brand, `md:inline` tab hint text | `app/(faces)/layout.tsx` L25, L39 |
| `sm:grid-cols-3` burn tiles; `sm:grid-cols-2` CSV/goal forms | `PastPanel`, `CsvUploadPanel`, `GoalPanel` |
| `lg:grid-cols-[400px_1fr]` login split; `lg:inline` email in AuthNav | `app/login/page.tsx`, `components/AuthNav.tsx` |
| `flex-wrap` on tabs, toolbar, suggestion chips | layout, `DecideChat` |
| Chat input `flex-col` → `sm:flex-row` | `DecideChat.tsx` L240 |

### Layout issues found

1. **Topbar overload (worst offender):** brand + 3 tabs + currency select + auth + persona
   select + status pills wrap into a 3–4 row header on a 360px screen, pushing content below
   the fold; the `ml-auto` chip group crowds against wrapped items.
2. **Charts:** fixed heights (`h-72` radar, `h-64` line in `PastPanel.tsx`) with long
   two-line radar angle labels — Recharts clips these at narrow widths; no horizontal-scroll
   wrapper or mobile-specific label strategy.
3. **Balance line density:** one point per transaction (~117 for personas) makes the X-axis
   unreadable on mobile despite `minTickGap`.
4. **Overflow:** long merchant descriptions and INR-formatted suggestion chips wrap acceptably,
   but stat tiles with large amounts can overflow their fixed grid at 320px.
5. **Navigation:** no mobile navigation pattern — the three tabs remain a wrapping horizontal
   row; acceptable for 3 items, but the surrounding controls make it feel broken.
6. **Tables:** no true data tables exist yet (transactions aren't listed) — the planned
   transaction table must be designed mobile-first (card rows on small screens).
7. **Touch:** buttons have `:active` scale states and adequate hit areas; the dropzone works
   via tap; native selects/date inputs behave fine. No swipe gestures anywhere. Voice input is
   a genuine mobile win already present.
8. **No viewport-level problems:** Next.js supplies the viewport meta; no fixed-width
   containers beyond charts.

## Part B — Roadmap

### Phase 1 — Mobile-first layout pass (pure CSS/JSX, no new infra)

- Split the topbar per the redesign ([03](03-ui-ux-audit-and-redesign.md) B2): bottom tab bar
  for faces on `< md`, account/settings behind a sheet; move persona/data-source into the PAST
  data-source card.
- Charts: responsive heights (`aspect-[4/3]` capped), shorter radar labels on mobile (initials
  + legend), weekly-bucketed balance series (fixes the density and the honesty bug together).
- Type ramp: hero stat scales down (`text-3xl sm:text-5xl`); tabular numerals prevent tile
  jitter.
- Audit at 320/360/390/768 widths as part of the redesign QA checklist.

### Phase 2 — Progressive Web App

Low effort, high fit — demo mode already works fully client-side, so an offline PWA is
unusually credible here:

- `manifest.json` (icons, `standalone`, theme color `#de5b32`), installability pass.
- Service worker (Serwist is the maintained Next.js App Router path): precache the shell,
  runtime-cache static assets; demo mode works fully offline since context lives in
  localStorage and inline math runs in… the server. **Caveat:** inline ML runs in Next.js API
  routes, so *computation* offline requires either porting `lib/ml/` calls into the client
  bundle (the code is plain TS — feasible) or accepting online-only analytics refresh.
- Offline indicator + queued CSV upload (Background Sync) for full-stack users.

### Phase 3 — Native Android

Recommended path: **Capacitor wrapper** around the PWA rather than a rewrite — the app is a
single-page-ish dashboard, no heavy native needs. Native adds two real capabilities:

- **SMS-based transaction ingestion** (Android permission `READ_SMS` with Play Store
  justification, or user-initiated share of bank SMS) — this removes the CSV-upload friction
  that is the biggest onboarding cliff vs GPay/CRED.
- Push notifications for the proactive alerts roadmap (runway shrinking, subscription creep).

### Phase 4 — Native iOS

Same Capacitor shell (no SMS access on iOS; rely on statement upload / future Account
Aggregator). Apple push + widgets (runway number as a home-screen widget is a strong retention
surface). Only invest after PWA analytics show mobile demand.

### Sequencing note

Phases 1–2 are prerequisites for 3–4 and independently valuable; the Capacitor decision can be
deferred until the PWA proves mobile engagement.
