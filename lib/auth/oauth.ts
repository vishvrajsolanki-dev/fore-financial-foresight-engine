import {
  Google,
  MicrosoftEntraId,
  generateCodeVerifier,
  generateState,
  decodeIdToken,
} from "arctic";

export type OAuthProvider = "google" | "microsoft";

export function authRedirectBase(): string {
  return (
    process.env.AUTH_REDIRECT_BASE?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function microsoftConfigured(): boolean {
  return !!(process.env.MS_CLIENT_ID?.trim() && process.env.MS_CLIENT_SECRET?.trim());
}

export function createGoogleClient(): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }
  return new Google(clientId, clientSecret, `${authRedirectBase()}/api/auth/oauth/google/callback`);
}

export function createMicrosoftClient(): MicrosoftEntraId {
  const clientId = process.env.MS_CLIENT_ID?.trim();
  const clientSecret = process.env.MS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("MS_CLIENT_ID and MS_CLIENT_SECRET are required");
  }
  const tenant = process.env.MS_TENANT_ID?.trim() || "common";
  return new MicrosoftEntraId(
    clientId,
    clientSecret,
    `${authRedirectBase()}/api/auth/oauth/microsoft/callback`,
    tenant
  );
}

export function newOAuthState() {
  return { state: generateState(), codeVerifier: generateCodeVerifier() };
}

export function oauthCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

export interface OAuthIdentity {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export function identityFromGoogleIdToken(idToken: string): OAuthIdentity {
  const claims = decodeIdToken(idToken) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!claims.sub || !claims.email) {
    throw new Error("Google ID token missing sub/email");
  }
  return {
    provider: "google",
    providerAccountId: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: !!claims.email_verified,
    name: claims.name,
  };
}

export function identityFromMicrosoftIdToken(idToken: string): OAuthIdentity {
  const claims = decodeIdToken(idToken) as {
    sub?: string;
    oid?: string;
    email?: string;
    preferred_username?: string;
    name?: string;
  };
  const email = (claims.email || claims.preferred_username || "").toLowerCase();
  const providerAccountId = claims.oid || claims.sub;
  if (!providerAccountId || !email || !email.includes("@")) {
    throw new Error("Microsoft ID token missing identity claims");
  }
  return {
    provider: "microsoft",
    providerAccountId,
    email,
    emailVerified: true,
    name: claims.name,
  };
}
