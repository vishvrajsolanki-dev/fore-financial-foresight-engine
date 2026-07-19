import { NextRequest, NextResponse } from "next/server";

import { COOKIE_ACCESS, cookieOptions, signAccessToken } from "@/lib/auth/jwt";
import { requireAuth, isAuthPayload } from "@/lib/auth/session";
import {
  appendTransactionsToSession,
  createSessionFromTransactions,
  loadExistingFingerprints,
  loadUserCategoryRules,
  sessionToContext,
} from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { parseBankCsv, inferIncomeBracket, inferCityTier } from "@/lib/csv/parseBankCsv";
import { dedupeTransactions, transactionFingerprint } from "@/lib/ml/fingerprint";
import { classifyTransactions } from "@/lib/ml/txnClassifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
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

  const nameOk = /\.csv$/i.test(file.name);
  const typeOk =
    !file.type ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/csv" ||
    file.type === "text/plain";
  if (!nameOk || !typeOk) {
    return NextResponse.json({ error: "Only .csv files are accepted" }, { status: 415 });
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

  const rules = await loadUserCategoryRules(auth.sub);
  const classified = classifyTransactions(
    parsed.transactions,
    rules.map((r) => ({
      matchType: r.matchType as "merchant" | "contains",
      pattern: r.pattern,
      category: r.category,
    }))
  );

  const existingFp = await loadExistingFingerprints(auth.sub);
  const { unique, skipped } = dedupeTransactions(classified, existingFp);
  const enriched = unique.map((t) => ({
    ...t,
    fingerprint: transactionFingerprint(t),
  }));

  const activeSession = await prisma.financialSession.findFirst({
    where: { userId: auth.sub, isActive: true, dataSource: "csv" },
  });

  let sessionId: string;

  if (activeSession && enriched.length > 0) {
    sessionId = activeSession.id;
    await appendTransactionsToSession({
      sessionId,
      userId: auth.sub,
      transactions: enriched,
      fileName: file.name,
      rowCount: enriched.length,
    });
  } else if (activeSession && enriched.length === 0) {
    sessionId = activeSession.id;
    await prisma.statementUpload.create({
      data: {
        sessionId,
        userId: auth.sub,
        fileName: file.name,
        rowCount: 0,
      },
    });
  } else {
    sessionId = await createSessionFromTransactions({
      userId: auth.sub,
      transactions: enriched.map((t) => ({
        ...t,
        fingerprint: t.fingerprint,
      })),
      monthlyIncome,
      incomeBracket: inferIncomeBracket(monthlyIncome),
      cityTier,
      dataSource: "csv",
      persona: `Bank import (${file.name})`,
      csvFileName: file.name,
    });
    if (enriched.length) {
      await prisma.statementUpload.create({
        data: {
          sessionId,
          userId: auth.sub,
          fileName: file.name,
          rowCount: enriched.length,
        },
      });
    }
  }

  await prisma.userConsent.upsert({
    where: { userId: auth.sub },
    create: { userId: auth.sub, csvUploadAt: new Date(), aiProcessingAt: new Date() },
    update: { csvUploadAt: new Date(), aiProcessingAt: new Date() },
  });

  const accessToken = await signAccessToken({ sub: auth.sub, sid: sessionId });
  const ctx = await sessionToContext(sessionId, auth.sub);

  const res = NextResponse.json({
    sessionId,
    context: ctx,
    meta: {
      rowCount: parsed.rowCount,
      imported: enriched.length,
      skippedRows: parsed.skippedRows,
      duplicatesSkipped: skipped + parsed.duplicatesRemoved,
      detectedFormat: parsed.detectedFormat,
      warnings: parsed.warnings,
    },
  });
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  return res;
  } catch (err) {
    console.error("CSV upload error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "CSV upload failed" }, { status: 500 });
  }
}
