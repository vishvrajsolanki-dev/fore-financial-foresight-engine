import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register", "/docs", "/api/auth", "/_next", "/favicon"];

function accessSecret(): Uint8Array {
  const s = process.env.JWT_ACCESS_SECRET?.trim();
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed in production — route handlers will also reject.
      return new TextEncoder().encode("");
    }
    return new TextEncoder().encode("fore-dev-access-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

async function isValidAccessToken(token: string): Promise<boolean> {
  try {
    const secret = accessSecret();
    if (!secret.length) return false;
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" && typeof payload.sid === "string";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Gate persistence APIs when DB is on. Face pages stay public for demo browsing;
  // /api/decide and /api/ml stay callable for demo personas (rate-limited in handlers).
  const isProtected =
    pathname.startsWith("/api/context") || pathname.startsWith("/api/upload");

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get("fore_access")?.value;
  if (!token || !(await isValidAccessToken(token))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
