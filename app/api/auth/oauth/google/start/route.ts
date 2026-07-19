import { NextRequest, NextResponse } from "next/server";

import {
  createGoogleClient,
  googleConfigured,
  newOAuthState,
  oauthCookieOptions,
} from "@/lib/auth/oauth";
import { isDatabaseConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=no_database", req.url));
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  const next = req.nextUrl.searchParams.get("next") || "/past";
  const { state, codeVerifier } = newOAuthState();
  const google = createGoogleClient();
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

  const res = NextResponse.redirect(url.toString());
  const opts = oauthCookieOptions();
  res.cookies.set("fore_oauth_state", state, opts);
  res.cookies.set("fore_oauth_verifier", codeVerifier, opts);
  res.cookies.set("fore_oauth_next", next.startsWith("/") ? next : "/past", opts);
  res.cookies.set("fore_oauth_provider", "google", opts);
  return res;
}
