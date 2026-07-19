import { NextRequest, NextResponse } from "next/server";

import {
  createMicrosoftClient,
  microsoftConfigured,
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
  if (!microsoftConfigured()) {
    return NextResponse.redirect(new URL("/login?error=microsoft_not_configured", req.url));
  }

  const next = req.nextUrl.searchParams.get("next") || "/past";
  const { state, codeVerifier } = newOAuthState();
  const ms = createMicrosoftClient();
  const url = ms.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email", "User.Read"]);

  const res = NextResponse.redirect(url.toString());
  const opts = oauthCookieOptions();
  res.cookies.set("fore_oauth_state", state, opts);
  res.cookies.set("fore_oauth_verifier", codeVerifier, opts);
  res.cookies.set("fore_oauth_next", next.startsWith("/") ? next : "/past", opts);
  res.cookies.set("fore_oauth_provider", "microsoft", opts);
  return res;
}
