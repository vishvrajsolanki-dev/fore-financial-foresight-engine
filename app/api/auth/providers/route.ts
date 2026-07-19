import { NextResponse } from "next/server";

import { googleConfigured, microsoftConfigured } from "@/lib/auth/oauth";
import { isDatabaseConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: which OAuth providers are configured for the login UI. */
export async function GET() {
  return NextResponse.json({
    database: isDatabaseConfigured(),
    google: isDatabaseConfigured() && googleConfigured(),
    microsoft: isDatabaseConfigured() && microsoftConfigured(),
  });
}
