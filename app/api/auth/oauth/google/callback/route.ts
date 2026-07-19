import { NextRequest, NextResponse } from "next/server";

import { completeOAuthLogin } from "@/lib/auth/establishSession";
import {
  createGoogleClient,
  identityFromGoogleIdToken,
} from "@/lib/auth/oauth";
import { isDatabaseConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=no_database", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("fore_oauth_state")?.value;
  const codeVerifier = req.cookies.get("fore_oauth_verifier")?.value;
  const next = req.cookies.get("fore_oauth_next")?.value || "/home";

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=oauth_state", req.url));
  }

  try {
    const google = createGoogleClient();
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const idToken = tokens.idToken();
    const identity = identityFromGoogleIdToken(idToken);
    const res = await completeOAuthLogin(identity, next);
    res.cookies.set("fore_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("fore_oauth_verifier", "", { path: "/", maxAge: 0 });
    res.cookies.set("fore_oauth_next", "", { path: "/", maxAge: 0 });
    res.cookies.set("fore_oauth_provider", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("Google OAuth callback failed:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/login?error=google_oauth_failed", req.url));
  }
}
