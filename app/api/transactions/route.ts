import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { computeAndPersistPast, listTransactionsPage } from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1).max(40),
  saveRule: z
    .object({
      matchType: z.enum(["merchant", "contains"]),
      pattern: z.string().min(1).max(80),
    })
    .optional(),
});

/** Paginated transactions for the active session (descriptions encrypted unless ?decrypt=1). */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
  const decrypt = req.nextUrl.searchParams.get("decrypt") === "1";

  const page = await listTransactionsPage({
    sessionId: auth.sid,
    userId: auth.sub,
    cursor,
    limit,
    decryptDescriptions: decrypt,
  });

  return NextResponse.json(page);
}

/** Recategorize one transaction; optionally save a CategoryRule. */
export async function PATCH(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, category, saveRule } = parsed.data;

  const txn = await prisma.transaction.findFirst({
    where: { id, sessionId: auth.sid, session: { userId: auth.sub } },
  });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.transaction.update({
    where: { id },
    data: { category, source: "user", confidence: 1 },
  });

  if (saveRule) {
    await prisma.categoryRule.create({
      data: {
        userId: auth.sub,
        matchType: saveRule.matchType,
        pattern: saveRule.pattern,
        category,
      },
    });
  }

  const session = await prisma.financialSession.findFirst({
    where: { id: auth.sid, userId: auth.sub },
  });
  if (session) {
    const rows = await prisma.transaction.findMany({
      where: { sessionId: auth.sid },
      orderBy: { date: "asc" },
      select: { date: true, category: true, amount: true, merchant: true },
    });
    const transactions = rows.map((r) => ({
      date: r.date,
      category: r.category,
      amount: r.amount,
      merchant: r.merchant ?? undefined,
    }));
    await computeAndPersistPast(
      auth.sid,
      transactions,
      session.monthlyIncome,
      session.incomeBracket,
      session.cityTier
    );
  }

  return NextResponse.json({ ok: true, id, category });
}
