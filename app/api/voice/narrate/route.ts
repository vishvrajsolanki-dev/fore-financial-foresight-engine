import { NextRequest, NextResponse } from "next/server";

import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Optional ElevenLabs TTS for DECIDE verdict narration (TIER2-11). */
export async function POST(req: NextRequest) {
  const limited = rateLimit({ key: clientKey(req, "voice"), limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": key,
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        model_id: "eleven_monolingual_v1",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("ElevenLabs error status:", res.status);
      return NextResponse.json({ error: "Voice narration failed" }, { status: 502 });
    }

    const audio = Buffer.from(await res.arrayBuffer());
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("TTS error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Voice narration failed" }, { status: 502 });
  }
}
