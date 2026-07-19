#!/usr/bin/env bash
# FORE — create .env.local on your machine (secrets are NEVER committed).
# Usage:
#   bash scripts/setup_local_env.sh
#   bash scripts/setup_local_env.sh "postgresql://..."   # optional Neon URL
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.local"
DB_ARG="${1:-}"

if [[ -f "$ENV_FILE" ]]; then
  echo "Found existing $ENV_FILE — keeping it."
  echo "To recreate from scratch, delete it first: rm $ENV_FILE"
  exit 0
fi

if [[ -n "$DB_ARG" ]]; then
  DATABASE_URL="$DB_ARG"
elif [[ -n "${DATABASE_URL:-}" ]]; then
  : # use env
else
  echo "Paste your Neon DATABASE_URL (from console.neon.tech), then press Enter:"
  read -r DATABASE_URL
fi

if [[ -z "${DATABASE_URL// }" ]]; then
  echo "ERROR: DATABASE_URL is required."
  exit 1
fi

JWT_ACCESS_SECRET="$(openssl rand -base64 48)"
DATA_ENCRYPTION_KEY="$(openssl rand -base64 32)"

cat > "$ENV_FILE" <<EOF
# FORE local secrets — DO NOT COMMIT (gitignored)
ML_MODE=inline
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AUTH_REDIRECT_BASE=http://localhost:3000

DATABASE_URL=${DATABASE_URL}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
DATA_ENCRYPTION_KEY=${DATA_ENCRYPTION_KEY}

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft OAuth skipped by default — leave blank
# MS_CLIENT_ID=
# MS_CLIENT_SECRET=
# MS_TENANT_ID=common

GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
GROQ_CRITIC_MODEL=llama-3.1-8b-instant
EOF

chmod 600 "$ENV_FILE"

# Prisma CLI reads .env
grep -E '^(DATABASE_URL|JWT_ACCESS_SECRET|DATA_ENCRYPTION_KEY)=' "$ENV_FILE" > .env
chmod 600 .env

echo ""
echo "Created $ENV_FILE and .env (both gitignored)."
echo "Next:"
echo "  npm install"
echo "  npx prisma generate"
echo "  npx prisma db push"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000/api/auth/providers"
echo "Optional: add Google keys to $ENV_FILE. Microsoft can stay blank."
