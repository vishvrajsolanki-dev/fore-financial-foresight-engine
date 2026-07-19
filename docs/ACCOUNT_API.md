# FORE — Account / Settings / Billing APIs

Additive surfaces for the product redesign. These routes **do not** change ML classify, burn-rate, or `canIAfford` logic.

Requires `DATABASE_URL` (full-stack mode). All authenticated routes use the existing JWT cookies.

## Auth recovery

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/forgot-password` | `{ email }` → always `{ ok: true }`; may include `devResetToken` when email is log-mode |
| POST | `/api/auth/reset-password` | `{ token, password }` |
| POST | `/api/auth/verify-email` | `{ token }` |
| POST | `/api/auth/resend-verification` | Auth required |

## Profile & security

| Method | Path | Notes |
|--------|------|-------|
| GET / PATCH | `/api/account/profile` | `name` |
| POST | `/api/account/password` | `{ currentPassword, newPassword }` — revokes refresh sessions |
| GET / DELETE | `/api/account/sessions` | List / revoke refresh tokens |

## Preferences (Appearance + Notifications)

| Method | Path | Notes |
|--------|------|-------|
| GET / PATCH | `/api/account/preferences` | `appearance`: `light` \| `evening`; notification booleans |

## Billing

| Method | Path | Notes |
|--------|------|-------|
| GET / PATCH | `/api/account/billing` | Local plan switch (`free` \| `pro` \| `business`) when Stripe unset |

## Product surfaces

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/home/pulse` | Assembled pulse for Home D1 |
| GET | `/api/merchants?merchant=` | List or merchant detail |
| GET | `/api/insights/weekly` | I2 weekly brief from spine |
| POST | `/api/reports/preview` | R2 builder preview |
| POST | `/api/reports/export` | CSV/JSON export |

## Existing (unchanged core)

Consent, export, delete, CSV upload, context, chat/decide, ML classify/burn-rate remain as before.
