/**
 * Minimal email adapter.
 * Without EMAIL_PROVIDER configured, messages are logged and returned for local/dev use.
 * Does not change auth or ML behavior — delivery is best-effort.
 */

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  delivered: boolean;
  provider: "none" | "log";
  /** Present only when no real provider is configured (dev / test). */
  preview?: OutboundEmail;
};

export async function sendEmail(msg: OutboundEmail): Promise<SendEmailResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "none" || provider === "log") {
    console.info("[fore-email]", msg.subject, "→", msg.to);
    return { delivered: false, provider: "log", preview: msg };
  }
  // Real providers can be wired here later without changing route contracts.
  console.info("[fore-email] provider", provider, "not implemented — logging");
  return { delivered: false, provider: "log", preview: msg };
}

export function appBaseUrl(): string {
  return (
    process.env.AUTH_REDIRECT_BASE?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}
