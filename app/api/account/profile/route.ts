import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureAccountExtras } from "@/lib/account/ensureAccountExtras";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
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

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
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

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data: { name?: string | null } = {};
  if ("name" in parsed.data) data.name = parsed.data.name ?? null;

  const user = await prisma.user.update({
    where: { id: auth.sub },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
