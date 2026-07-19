# 03 — UI/UX Audit & Redesign Plan

## Part A — Audit of the current frontend

The app uses a self-consistent "Warm Ledger" theme: ivory background, terracotta accent,
green secondary, film-grain gradient overlay, defined entirely as CSS variables +
`@layer components` classes in `app/globals.css` (Tailwind config is an empty `extend`).

### Visual hierarchy

- **Good:** consistent kicker → title → muted-body pattern (`.face-kicker`, bold titles),
  card-based layout, `max-w-6xl` shell shared across faces, insight boxes for callouts.
- **Weak:** the topbar carries too much simultaneous weight — brand, three face tabs, currency
  selector, auth controls, persona `<select>`, and status pills all compete on one row and wrap
  unpredictably. Dashboards bury the single most important number (runway / zero-balance date)
  inside a stat tile grid instead of leading with it.

### Typography

- System font stack only (`ui-sans-serif, system-ui, … Roboto, Arial` — `app/globals.css`
  L34–35). Functional, but generic: this is the single biggest contributor to the "tacky"
  impression because the theme's warmth isn't matched by any typographic identity.
- No tabular figures for numbers — amounts in stat tiles and tables shift width as they change.
- Hierarchy relies on weight alone; no display face for the big numbers.

### Spacing & consistency

- Consistent `gap-4` grids, `rounded-2xl` cards, shared `.card`/`.btn`/`.pill` classes — good.
- Inconsistencies: login page is a rich two-column marketing layout while register is a bare
  single card; `/docs/security` uses `prose prose-invert` (dark-theme typography) on the light
  theme; the AHEAD PNG export (`lib/export/aheadSummary.ts`) still renders the *old dark navy
  palette*, so shared images don't match the product.

### Accessibility

| Good | Gap |
|------|-----|
| `aria-label` on nav, currency select, chat input, CSV dropzone | Charts have no text alternative (radar + line are canvas/SVG only) |
| Dropzone supports Enter/Space keyboard activation | Voice button is a bare 🎤 emoji — no accessible name conveying state |
| Form fields have labels | Chat message list keyed by array index (`DecideChat.tsx` L194) |
| Decorative SVGs `aria-hidden` | No skip link; focus style only on `.input:focus` |
| Terracotta-on-ivory contrast generally passes | `prose-invert` page fails contrast on light bg |

### Mobile responsiveness

Covered in depth in [07-mobile-and-pwa.md](07-mobile-and-pwa.md). Headlines: wrapping topbar,
fixed-height charts (`h-72`/`h-64`) that clip radar labels, one chart point per transaction on
the balance line, no mobile navigation pattern.

### Navigation & IA

Three-tab navigation (PAST/DECIDE/AHEAD) is clear and matches the product story. Gaps: no
onboarding path (a first-time user lands on PAST with a persona `<select>` and no guidance),
no settings surface, no place for the correction queue / privacy controls the roadmap needs.

### Empty states, loading, motion

Genuinely good for a hackathon: route-level `loading.tsx` skeletons, card/chart skeletons,
empty states for "no persona", "no analysis", empty chat, empty benchmark; `rise-in` entrance
animation, button hover/active states, chart animations. What reads cheap: the `btn-shine`
sweep effect, the film-grain overlay on every page, and emoji used as icons (🎤, pills).

### Why it reads "tacky" — root causes

1. System fonts + no typographic scale for numbers.
2. Emoji as icons instead of a real icon set.
3. Overloaded wrapping topbar (feels like a debug toolbar, not a product shell).
4. Film grain + dual radial gradients + shine effects — decorative noise without a matching
   level of polish elsewhere.
5. Only two charts, one of them mislabeled; stat tiles all identical weight.
6. Native `<select>` for the core persona/data-source choice.
7. Off-theme artifacts (dark PNG export, `prose-invert` page).

---

## Part B — Redesign plan (modern SaaS appearance)

Keep the Warm Ledger identity (it's distinctive — most fintech is navy/neon); upgrade its
execution.

### B1. Foundations

- **Typography:** load two variable fonts via `next/font` — a grotesque for UI (e.g. Inter or
  Geist) and a display face for hero numbers (e.g. Instrument Serif or Fraunces, which suits
  the "warm ledger" story). Enable `font-variant-numeric: tabular-nums` on all amounts. Define
  a type scale (12/14/16/20/28/40) as CSS vars.
- **Icons:** replace all emoji with `lucide-react`; consistent 16/20px sizes, stroke width 1.5.
- **Color:** keep the token set (`--bg`, `--card`, `--accent`, `--accent-2`) but add semantic
  tokens (`--positive`, `--negative`, `--warning`) — red/green spend indicators are currently
  ad hoc. Reduce the grain overlay to the login page only, or remove it.
- **Elevation:** one shadow scale (rest / hover / overlay) instead of per-component values.

### B2. App shell

Replace the single overloaded topbar with:

- **Desktop:** slim left sidebar — logo, PAST/DECIDE/AHEAD (icon + label), spacer, settings,
  account. Top of the content area keeps only context-relevant controls (active data source
  chip, currency).
- **Mobile:** bottom tab bar for the three faces + a sheet for account/settings.
- Persona/data-source selection moves out of the header into an explicit **data source card**
  on PAST (and the onboarding flow).

### B3. Onboarding

First-run flow instead of a bare persona `<select>`:

1. Welcome → what FORE does in one sentence per face.
2. Choose path: "Try a demo persona" (cards with name, income, one-line spending story) or
   "Upload my statement" (dropzone with bank logos + the privacy one-liner: what is stored,
   what is encrypted, what the AI sees).
3. Income + city confirmation → land on PAST with a guided highlight of the runway number.

### B4. Dashboard (PAST) redesign

- Lead with a **hero stat**: projected zero-balance date + runway days, with confidence label —
  display type, not a tile among tiles.
- Second row: archetype card (radar shrinks to a supporting visual, with the per-feature
  "because" explanation) + burn trend.
- New charts per [09-charts-audit.md](09-charts-audit.md): category donut, monthly cashflow
  bars, fixed balance line (real sampling, honest window label).
- Transaction table with category chips + confidence + one-tap recategorize (feeds the
  correction loop).

### B5. Cards, interactions, animations

- Cards: one component with header/body/footer slots; kicker + title + action affordance;
  hover elevation only where clickable.
- Replace `btn-shine` with a subtle 150ms color/elevation transition; keep `rise-in` but
  stagger children (30ms) instead of animating whole pages.
- Number transitions: animate stat changes (count-up on load, tween on persona switch) —
  cheap, high perceived quality.
- Chat: message entrance slide+fade, typing indicator, tool-call badge redesigned as an
  expandable "show the math" row — this is the differentiator, make it inspectable.

### B6. Empty states

Replace text-only empties with a small illustration (single-color line style matching the
accent), one sentence, and one primary action ("Upload a statement", "Ask your first
question", "Set a goal"). The benchmark empty state should explain *why* it's empty (needs
income bracket + city).

### B7. Accessibility fixes (do during redesign, not after)

- Text alternatives/`role="img"` + summary for every chart; data table fallback behind a
  toggle.
- Stable message keys; labeled voice button with pressed state; skip link; visible focus ring
  token applied globally; fix `/docs/security` typography; contrast-check the new semantic
  colors.

### B8. Implementation approach

Incremental, not big-bang: foundations (fonts/icons/tokens) → shell → PAST → DECIDE → AHEAD →
onboarding. Each step is independently shippable; the existing CSS-variable architecture makes
the token work low-risk. Component library optional — the current hand-rolled classes are
serviceable; if standardizing, shadcn/ui matches this stack (Tailwind, App Router) with full
theme control.
