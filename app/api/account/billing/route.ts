import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureAccountExtras } from "@/lib/account/ensureAccountExtras";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { billingMode, isPlanId, PLANS } from "@/lib/billing/plans";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  plan: z.string(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await ensureAccountExtras(auth.sub);
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { userId: auth.sub } });

  return NextResponse.json({
    mode: billingMode(),
    plans: Object.values(PLANS),
    subscription: {
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (billingMode() === "stripe") {
    return NextResponse.json(
      {
        error:
          "Stripe mode enabled — use checkout/portal endpoints when wired. Local plan PATCH disabled.",
      },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || !isPlanId(parsed.data.plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await ensureAccountExtras(auth.sub);

  const periodEnd =
    parsed.data.plan === "free"
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const sub = await prisma.subscription.update({
    where: { userId: auth.sub },
    data: {
      plan: parsed.data.plan,
      status: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: parsed.data.cancelAtPeriodEnd ?? false,
    },
  });

  return NextResponse.json({
    mode: "local",
    subscription: {
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  });
}
