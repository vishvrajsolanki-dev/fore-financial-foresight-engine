import { NextRequest, NextResponse } from "next/server";

import { COOKIE_ACCESS, cookieOptions, signAccessToken } from "@/lib/auth/jwt";
import { requireAuth, isAuthPayload } from "@/lib/auth/session";
import { createSessionFromTransactions, sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { parseBankCsv, inferIncomeBracket, inferCityTier } from "@/lib/csv/parseBankCsv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — raw CSV never persisted, only parsed rows

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  const monthlyIncomeRaw = form.get("monthlyIncome");
  const cityTierRaw = form.get("cityTier");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  const monthlyIncome = Number(monthlyIncomeRaw);
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    return NextResponse.json({ error: "monthlyIncome must be a positive number" }, { status: 400 });
  }

  const cityTier = inferCityTier(String(cityTierRaw ?? "Tier 2"));
  const text = await file.text();

  let parsed;
  try {
    parsed = parseBankCsv(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CSV parse failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Raw CSV is discarded after parse — only normalized transactions are stored (encrypted descriptions).
  const sessionId = await createSessionFromTransactions({
    userId: auth.sub,
    transactions: parsed.transactions,
    monthlyIncome,
    incomeBracket: inferIncomeBracket(monthlyIncome),
    cityTier,
    dataSource: "csv",
    persona: `Bank import (${file.name})`,
    csvFileName: file.name,
  });

  const accessToken = await signAccessToken({ sub: auth.sub, sid: sessionId });
  const ctx = await sessionToContext(sessionId);

  const res = NextResponse.json({
    sessionId,
    context: ctx,
    meta: {
      rowCount: parsed.rowCount,
      skippedRows: parsed.skippedRows,
      detectedFormat: parsed.detectedFormat,
      warnings: parsed.warnings,
    },
  });
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  return res;
}
