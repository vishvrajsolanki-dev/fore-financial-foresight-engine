# 04 — Authentication Improvements

Goal: replace the demo-stub provider sign-in with real Google and Microsoft OAuth, keep the
solid email/password core, and close the session-handling gaps found in the audit.

## What exists today

| Piece | State |
|-------|-------|
| Email + password | Real: zod validation, bcrypt 12 rounds (`lib/auth/password.ts`), generic error messages |
| Access tokens | HS256 JWT via `jose`, 15-min TTL, payload `sub` (userId) + `sid` (session) only (`lib/auth/jwt.ts`) |
| Refresh tokens | 32-byte random, scrypt-hashed at rest, 7-day TTL, rotated on refresh, revocable (`app/api/auth/refresh/route.ts`) |
| Cookies | `fore_access` / `fore_refresh`: httpOnly, Secure in prod, SameSite=Lax |
| Google/Microsoft/GitHub buttons | **Fake** — POST `/api/auth/demo` logs into shared accounts `demo-{provider}@fore.app` with a password hardcoded in source (`app/api/auth/demo/route.ts` L21). Documented as stage-flow stubs in `app/login/page.tsx` L7–8 |
| Middleware | Cookie-presence check only on `/api/context*` + `/api/upload*`; JWT never verified in middleware; no-op without `DATABASE_URL` (`middleware.ts`) |

## Design decision: Auth.js vs extending the hand-rolled stack

Two viable paths:

**Option A — Auth.js (NextAuth v5).** Google/Microsoft (Entra ID) providers are first-class,
battle-tested token/callback handling, CSRF built in. Cost: it wants to own the session
(its own JWT/cookie or DB session via the Prisma adapter), so the existing `fore_access`/
`fore_refresh` + `sid` model would be reworked; the `sid` claim that routes rely on
(`requireAuth` in `lib/auth/session.ts`) must be re-plumbed through Auth.js session callbacks.

**Option B — keep the current JWT stack, add OAuth with a thin OIDC client** (`arctic` or
`openid-client`): implement `/api/auth/oauth/{google,microsoft}/start` (state + PKCE, redirect)
and `/callback` (code exchange, ID-token verification, then issue the *existing* access/refresh
cookies). Cost: ~2 focused route files per provider and owning state/PKCE/nonce handling.

**Recommendation: Option B.** The current session model (short access JWT + rotated hashed
refresh + `sid` binding to a financial session) is already better than Auth.js defaults for this
app, and everything downstream (`requireAuth`, refresh loop, logout) keeps working unchanged.
Auth.js becomes attractive only if many more providers are planned.

## Implementation plan

### 1. OAuth (Google + Microsoft)

- Schema: add `provider` (`email` | `google` | `microsoft`), `providerAccountId`, and make
  `passwordHash` nullable on `User`; unique constraint on `(provider, providerAccountId)`.
  Link-by-verified-email when an existing email user signs in with Google (email is verified by
  the IdP).
- Routes:
  - `GET /api/auth/oauth/:provider/start` — generate `state` + PKCE verifier, store in a short
    httpOnly cookie, redirect to the provider authorize URL.
  - `GET /api/auth/oauth/:provider/callback` — validate state, exchange code, **verify the ID
    token signature and `aud`/`iss`/`nonce`**, upsert user, ensure an active financial session
    (reuse `ensureActiveSession` logic from the demo route), issue existing cookies, redirect to
    `/past`.
- Env: `GOOGLE_CLIENT_ID/SECRET`, `MS_CLIENT_ID/SECRET` (+ tenant `common`), `AUTH_REDIRECT_BASE`.
- UI: the login buttons keep their design but hit the real start routes. **Delete
  `/api/auth/demo` and the stub flow** — replace the demo path with an explicit "Explore with
  demo data" button that stays client-side (demo mode) and never mints credentials.

### 2. Email authentication upgrades

- Keep bcrypt flow. Add email verification (signed one-time token, required before full-stack
  features) and password reset via the same token mechanism.
- Fix the timing oracle: run a dummy bcrypt compare when the user doesn't exist
  (`app/api/auth/login/route.ts` L36–38).
- Optional later: passkeys/WebAuthn — fits the privacy positioning.

### 3. Secure session management fixes

| Fix | Where |
|-----|-------|
| Verify JWT signature/expiry in middleware (jose is edge-compatible), not just cookie presence | `middleware.ts` L24–34 |
| Extend middleware protection to `/api/decide`, `/api/ml/*`, `/api/voice/*` (with the demo-mode carve-out made explicit) | `middleware.ts` L16–22 |
| Bind `/api/auth/me` to session ownership (`sid` must belong to `sub`, `isActive`) — same check as `requireAuth` | `app/api/auth/me/route.ts` |
| Scope `sessionToContext` by userId | `lib/db/contextService.ts` L30–34 |
| Revoke outstanding refresh tokens on password change; cap tokens per user (e.g. 5 newest) and prune expired rows on refresh | `refresh/route.ts`, `login/route.ts` |
| Add `__Host-` cookie prefix in production; add an origin check on state-changing POSTs as CSRF defense-in-depth | `lib/auth/jwt.ts` |
| Rate-limit `/api/auth/*` (per-IP sliding window; Upstash Ratelimit or equivalent on Vercel) | new `lib/security/rateLimit.ts` |
| Remove the dev JWT secret fallback outside `NODE_ENV=development`; fail fast in preview envs too | `lib/auth/jwt.ts` L13–19 |

### 4. Sequencing

1. Middleware JWT verification + `me`/`sessionToContext` scoping (small, immediate risk cuts).
2. Google OAuth end to end (start/callback, schema migration, UI swap).
3. Microsoft OAuth (same skeleton, Entra endpoints).
4. Delete `/api/auth/demo`; introduce the honest client-side demo entry.
5. Email verification + password reset.
6. Rate limiting + cookie hardening + token pruning.

### 5. Testing

- Unit: state/PKCE round-trip, ID-token validation failures (bad `aud`, expired, wrong issuer).
- Integration: new-user OAuth signup, email-linking, refresh rotation after OAuth login,
  logout revocation, middleware 401s on tampered JWTs.
- The existing `scripts/run_full_tests.sh` battery gains an auth suite stage.
