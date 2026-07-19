#!/usr/bin/env bash
# FORE — comprehensive test runner for demo spine + Blueprint 2 full-stack
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_URL="${DATABASE_URL:-postgresql://fore_test:fore_test_pass@127.0.0.1:5432/fore_test?schema=public}"
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-test-jwt-secret-min-32-characters-long}"
export DATA_ENCRYPTION_KEY="${DATA_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"
export RENDER_ML_BASE_URL="${RENDER_ML_BASE_URL:-http://127.0.0.1:8000}"

PASS=0
FAIL=0
ML_PID=""
NEXT_PID=""

cleanup() {
  kill $ML_PID $NEXT_PID 2>/dev/null || true
}
trap cleanup EXIT

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1: $2"; FAIL=$((FAIL+1)); }

echo "FORE Full Test Suite"
echo "===================="

echo ""
echo "[1] Unit tests (CSV, crypto, JWT, benchmark, goal)"
if npx tsx scripts/unit_tests.ts; then pass "Unit tests"; else fail "Unit tests" "see above"; fi

echo ""
echo "[2] ML pytest"
if npm run test:ml; then pass "ML pytest"; else fail "ML pytest" "failed"; fi

echo ""
echo "[2b] TS ↔ Python parity (SKIP_PYTHON=1 when service unavailable)"
if SKIP_PYTHON=1 npm run test:parity; then pass "ML parity"; else fail "ML parity" "failed"; fi

echo ""
echo "[3] Data verify (5 personas)"
if npm run verify; then pass "verify_task004"; else fail "verify_task004" "failed"; fi

echo ""
echo "[4] Production build"
if npm run build; then pass "next build"; else fail "next build" "failed"; fi

echo ""
echo "[5] Start ML + Next (demo mode)"
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

(cd "$ROOT/ml-service" && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000) &
ML_PID=$!
sleep 2

(cd "$ROOT" && RENDER_ML_BASE_URL=http://127.0.0.1:8000 npm run dev -- -p 3000) &
NEXT_PID=$!
sleep 10

echo ""
echo "[6] Demo spine smoke"
if python3 "$ROOT/scripts/smoke_demo_spine.py"; then pass "Demo spine §8"; else fail "Demo spine" "failed"; fi

echo ""
echo "[7] Full-stack (PostgreSQL)"
kill $NEXT_PID 2>/dev/null || true
sleep 2

export DATABASE_URL="$DB_URL"
if DATABASE_URL="$DB_URL" npx prisma db push --force-reset --accept-data-loss >/dev/null 2>&1; then
  pass "prisma db push"
else
  fail "prisma db push" "failed"
fi

(cd "$ROOT" && DATABASE_URL="$DB_URL" JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" \
  DATA_ENCRYPTION_KEY="$DATA_ENCRYPTION_KEY" RENDER_ML_BASE_URL=http://127.0.0.1:8000 \
  npm run dev -- -p 3001) &
NEXT_PID=$!
sleep 12

if TEST_BASE_URL=http://127.0.0.1:3001 npx tsx "$ROOT/scripts/fullstack_tests.ts"; then
  pass "Full-stack auth + CSV + persist"
else
  fail "Full-stack integration" "see above"
fi

echo ""
echo "===================="
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
echo "ALL TESTS PASSED"
