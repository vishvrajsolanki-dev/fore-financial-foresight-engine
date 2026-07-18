import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/docs", "/api/auth", "/_next", "/favicon"];

export async function middleware(req: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only gate persistence APIs — face pages run client-side demo mode without a JWT.
  const isProtected =
    pathname.startsWith("/api/context") || pathname.startsWith("/api/upload");

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get("fore_access")?.value;
  if (!token) {
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
