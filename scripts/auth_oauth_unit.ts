/** Unit checks for OAuth helpers (no live IdP required). */
import {
  googleConfigured,
  microsoftConfigured,
  identityFromGoogleIdToken,
  identityFromMicrosoftIdToken,
  newOAuthState,
} from "../lib/auth/oauth";
async function fakeIdToken(payload: Record<string, unknown>) {
  // decodeIdToken only base64-decodes the payload segment — signature not verified by arctic helper.
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `hdr.${body}.sig`;
}

async function main() {
  const { state, codeVerifier } = newOAuthState();
  if (!state || !codeVerifier) throw new Error("state/verifier");

  const gTok = await fakeIdToken({
    sub: "google-sub-1",
    email: "User@Example.com",
    email_verified: true,
    name: "Test User",
  });
  const g = identityFromGoogleIdToken(gTok);
  if (g.email !== "user@example.com" || g.provider !== "google") throw new Error("google identity");

  const mTok = await fakeIdToken({
    oid: "ms-oid-1",
    preferred_username: "ms.user@contoso.com",
    name: "MS User",
  });
  const m = identityFromMicrosoftIdToken(mTok);
  if (m.provider !== "microsoft" || m.email !== "ms.user@contoso.com") throw new Error("ms identity");

  // Config flags should be false without secrets in this environment
  if (googleConfigured() && !process.env.GOOGLE_CLIENT_ID) throw new Error("googleConfigured leak");
  if (microsoftConfigured() && !process.env.MS_CLIENT_ID) throw new Error("msConfigured leak");

  console.log("  Auth OAuth unit checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
