# AGENTS.md

## Cursor Cloud specific instructions

FORE is a single Next.js 14 app (the PAST/DECIDE/AHEAD faces + API routes) plus an optional Python FastAPI ML microservice (`ml-service/`). Standard commands live in `README.md` and `package.json` scripts; only the non-obvious caveats are below.

### Two run modes
- Demo mode (no `DATABASE_URL`): no auth, client-side synthetic personas. The three faces work with just `npm run dev`.
- Full-stack mode (`DATABASE_URL` set, as in the checked-in `.env.local`): JWT auth + PostgreSQL persistence + bank CSV upload. In this mode the root `/` and unauthenticated pages redirect to `/login`; register a user at `/register` to get an authenticated dashboard.

### ML service
- `ML_MODE=inline` (default when `RENDER_ML_BASE_URL` is empty) runs the ML math in TypeScript inside Next.js, so the Python service is NOT required for the app to work.
- To exercise the real Python service, start it (`cd ml-service && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000`, health at `/health`) and run Next with `RENDER_ML_BASE_URL=http://127.0.0.1:8000 npm run dev`.

### Gotchas
- Prisma CLI reads `.env`, NOT `.env.local`. `npm run dev`/`next build` read `.env.local` fine, but `prisma db push`/`prisma migrate` need `DATABASE_URL` in the environment — run them as `DATABASE_URL="postgresql://fore:fore_dev_pass@localhost:5432/fore" npx prisma db push`.
- Python console scripts (`uvicorn`, `pytest`) install to `~/.local/bin`, which may not be on `PATH`. Invoke via `python3 -m uvicorn ...` / `python3 -m pytest` (which is what `npm run test:ml` already does).

### PostgreSQL (only for full-stack mode / `npm run test:all` step 7)
Not containerized in-repo. Full-stack dev and the full test suite expect a local Postgres. If it is not already running:
- `sudo pg_ctlcluster 16 main start`
- Dev DB/role: role `fore`/`fore_dev_pass`, db `fore` → `postgresql://fore:fore_dev_pass@localhost:5432/fore` (matches `.env.local`).
- Test DB/role (used by `scripts/run_full_tests.sh`): role `fore_test`/`fore_test_pass`, db `fore_test`.
- Apply schema: `DATABASE_URL=... npx prisma db push`.

### Lint / test / build / run
- Lint: `npm run lint`
- Unit (TS): `npx tsx scripts/unit_tests.ts`; ML: `npm run test:ml`; data: `npm run verify`; full suite (needs Postgres + starts ML/Next): `npm run test:all`
- Build: `DATABASE_URL=... npm run build`
- Run: ML on `:8000` (see above) then `RENDER_ML_BASE_URL=http://127.0.0.1:8000 npm run dev` on `:3000`
