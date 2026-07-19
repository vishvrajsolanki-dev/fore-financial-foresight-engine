import { hashToken } from "@/lib/security/encryption";
import { prisma } from "@/lib/db/prisma";

export type AuthTokenType = "email_verify" | "password_reset";

const TTL_MS: Record<AuthTokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
};

export function generateAuthTokenRaw(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** Issue a one-time auth token; invalidates prior unused tokens of the same type. */
export async function issueAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const raw = generateAuthTokenRaw();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TTL_MS[type]);

  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: { userId, type, tokenHash, expiresAt },
  });

  return raw;
}

export async function consumeAuthToken(
  raw: string,
  type: AuthTokenType
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  await prisma.authToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { userId: row.userId };
}
