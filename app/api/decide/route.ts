// FORE — app/api/decide/route.ts
// Owner: TASK-005 (Allen, skeleton) / TASK-008 (Allen, chat UI wiring).
// Accepts a chat message, calls Groq/Llama 3.1 with tool-calling enabled, wires canIAfford().
// Dev GROQ_API_KEY only until TASK-012's rotation, per CONTRACT-008.

import { NextRequest, NextResponse } from "next/server";
import { canIAffordToolDefinition, canIAfford } from "@/lib/tools/canIAfford";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // TODO(TASK-005): wire the real Groq tool-calling round-trip here.
  // - Use process.env.GROQ_API_KEY (dev key)
  // - Pass canIAffordToolDefinition in the `tools` array
  // - On a tool_calls response, execute canIAfford() and feed the result back to the model
  // - Confirm the "hi" edge case does NOT trigger a spurious tool call

  return NextResponse.json(
    { error: "TASK-005 not yet implemented" },
    { status: 501 }
  );
}
