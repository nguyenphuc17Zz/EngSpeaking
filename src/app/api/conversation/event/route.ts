import { NextResponse } from "next/server";
import { maybeGenerateEvent } from "@/lib/conversation/engines/event-engine";
import type { ConversationWorldState } from "@/types/conversation-world";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { worldState, recentTurns, provider = "gemini", model = "auto", force = false } = body as {
    worldState?: ConversationWorldState;
    recentTurns?: Array<{ role: string; text: string }>;
    provider?: string;
    model?: string;
    force?: boolean;
  };
  if (!worldState) return NextResponse.json({ error: { message: "Thiếu worldState" } }, { status: 400 });
  const event = await maybeGenerateEvent(worldState, recentTurns || [], { provider, model, force });
  return NextResponse.json({ event });
}
