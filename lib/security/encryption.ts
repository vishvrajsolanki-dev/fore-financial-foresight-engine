import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function deriveKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (secret) {
    if (secret.length >= 44 && /^[A-Za-z0-9+/=]+$/.test(secret)) {
      const buf = Buffer.from(secret, "base64");
      if (buf.length === KEY_LEN) return buf;
    }
    return scryptSync(secret, "fore-salt-v1", KEY_LEN);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is required in production when storing bank data");
  }
  return scryptSync("fore-dev-only-key", "fore-salt-v1", KEY_LEN);
}

/** Encrypt transaction descriptions at rest (real bank narrations may contain PII). */
export function encryptField(plaintext: string): string {
  if (!plaintext) return "";
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptField(ciphertext: string): string {
  if (!ciphertext) return "";
  const key = deriveKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hashToken(raw: string): string {
  return scryptSync(raw, "fore-token-salt", 32).toString("hex");
}
