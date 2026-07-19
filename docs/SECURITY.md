# FORE — Security & Real Bank Data Protection

This document describes how FORE protects user data when **full-stack mode** is enabled (PostgreSQL + JWT auth per FORE Blueprint 2 §7).

## Threat model

FORE handles sensitive personal financial data when users upload real bank CSV exports. We assume:

- Attackers may attempt credential theft, session hijacking, or database exfiltration.
- Raw CSV files may contain account numbers in narration fields.
- The LLM (Groq) must never receive credentials — only normalized transaction summaries and computed context.

## Authentication (JWT + refresh rotation)

| Control | Implementation |
|---|---|
| Access token lifetime | **15 minutes** — [`lib/auth/jwt.ts`](lib/auth/jwt.ts) |
| Refresh token lifetime | **7 days**, stored **hashed** in PostgreSQL — revocable on logout |
| Password storage | **bcrypt** (12 rounds) — [`lib/auth/password.ts`](lib/auth/password.ts) |
| Token transport | **httpOnly, Secure (prod), SameSite=Lax** cookies — never `localStorage` |
| JWT payload | **`sub` (userId) + `sid` (sessionId) only** — no email, income, or transactions in the token |

Refresh tokens are rotated on each `/api/auth/refresh` call; old tokens are marked `revokedAt`.

## Data at rest (PostgreSQL)

| Field | Protection |
|---|---|
| `users.password_hash` | bcrypt one-way hash |
| `transactions.description_enc` | **AES-256-GCM** encrypted — [`lib/security/encryption.ts`](lib/security/encryption.ts) |
| `transactions.amount`, `date`, `category` | Plain numeric/categorical (required for ML math); scoped by `userId` via session FK |
| Raw CSV file | **Never stored** — parsed in memory, discarded after normalization |

Set `DATA_ENCRYPTION_KEY` to a 32-byte base64 key in production (see `.env.example`).

## Data in transit

- HTTPS required in production (Vercel + Render).
- CORS locked to explicit origins on the ML service (`ALLOWED_ORIGINS`).
- Groq API calls are server-side only (`GROQ_API_KEY` never exposed to the browser).

## Access control

- Every `/api/context`, `/api/upload`, and protected face route requires a valid access token.
- Middleware ([`middleware.ts`](middleware.ts)) enforces auth when `DATABASE_URL` is set.
- All Prisma queries filter by authenticated `userId` — users cannot read another user's sessions.
- Deleting a user cascades sessions, transactions, and refresh tokens.

## Bank CSV handling

1. User uploads CSV via authenticated multipart form (max **5 MB**).
2. Parser ([`lib/csv/parseBankCsv.ts`](lib/csv/parseBankCsv.ts)) detects Indian bank column layouts (HDFC/ICICI/SBI-style).
3. Descriptions are encrypted before insert; filename stored as metadata only.
4. **Raw CSV bytes are not written to disk or database.**

## LLM / DECIDE privacy

- Chat and DECIDE routes send a **spine summary** to the LLM — archetype label, monthly income, burn rate, goal, and tool results (category totals, amounts, dates). Encrypted narration blobs are **not** sent by default.
- Transaction descriptions are decrypted **only** when the model calls the scoped `searchTransactions` tool with `allow_descriptions: true` — and only for the authenticated user's session rows.
- Do not log request bodies containing financial context in production.

## Environment variables (required for production full-stack)

```bash
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<long random string>
DATA_ENCRYPTION_KEY=<32-byte base64>
RENDER_ML_BASE_URL=https://...
GROQ_API_KEY=...
ALLOWED_ORIGINS=https://your-app.vercel.app
```

## Demo mode (no DATABASE_URL)

When `DATABASE_URL` is unset, FORE runs in **hackathon demo mode**: client-side context, no auth, synthetic personas only. No real bank data should be used in this mode on shared machines.

## Compliance notes (not legal advice)

FORE is not licensed financial advice. For production use with real bank data, you would additionally need: privacy policy, data retention policy, user consent for CSV upload, and jurisdiction-specific regulations (e.g. India DPDP Act). This hackathon build implements technical controls only.

## Incident response

1. Rotate `JWT_ACCESS_SECRET` and revoke all refresh tokens.
2. Rotate `DATA_ENCRYPTION_KEY` (requires re-encrypting descriptions).
3. Audit Render/Vercel access logs for anomalous `/api/upload` volume.
