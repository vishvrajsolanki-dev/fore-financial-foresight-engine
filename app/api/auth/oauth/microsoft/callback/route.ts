import { NextRequest, NextResponse } from "next/server";

import { completeOAuthLogin } from "@/lib/auth/establishSession";
import {
  createMicrosoftClient,
  identityFromMicrosoftIdToken,
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
    const ms = createMicrosoftClient();
    const tokens = await ms.validateAuthorizationCode(code, codeVerifier);
    const idToken = tokens.idToken();
    const identity = identityFromMicrosoftIdToken(idToken);
    const res = await completeOAuthLogin(identity, next);
    res.cookies.set("fore_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("fore_oauth_verifier", "", { path: "/", maxAge: 0 });
    res.cookies.set("fore_oauth_next", "", { path: "/", maxAge: 0 });
    res.cookies.set("fore_oauth_provider", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("Microsoft OAuth callback failed:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/login?error=microsoft_oauth_failed", req.url));
  }
}
