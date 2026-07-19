import { prisma } from "@/lib/db/prisma";

/** Ensure preferences + free subscription exist for a user (idempotent). */
export async function ensureAccountExtras(userId: string): Promise<void> {
  await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, plan: "free", status: "active" },
    update: {},
  });
}
