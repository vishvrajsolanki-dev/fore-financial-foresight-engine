import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { COOKIE_ACCESS, cookieOptions, signAccessToken } from "@/lib/auth/jwt";
import { requireAuth, isAuthPayload } from "@/lib/auth/session";
import { createSessionFromTransactions, sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { getPersona } from "@/lib/data/personas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ personaId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "personaId required" }, { status: 400 });
  }

  const seed = getPersona(parsed.data.personaId);
  if (!seed) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
  }

  const sessionId = await createSessionFromTransactions({
    userId: auth.sub,
    transactions: seed.transactions,
    monthlyIncome: seed.monthly_income,
    incomeBracket: seed.income_bracket,
    cityTier: seed.city_tier,
    dataSource: "demo",
    persona: seed.persona,
  });

  const accessToken = await signAccessToken({ sub: auth.sub, sid: sessionId });
  const ctx = await sessionToContext(sessionId, auth.sub);

  const res = NextResponse.json({ sessionId, context: ctx });
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  return res;
}
