import { NextResponse } from "next/server";
import { summarizeConversation } from "@/lib/conversation/engines/summarizer";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { worldId, olderTurns, existingSummaryJson, provider = "gemini", model = "auto" } = body as {
    worldId?: string;
    olderTurns?: Array<{ role: string; text: string }>;
    existingSummaryJson?: string;
    provider?: string;
    model?: string;
  };
  if (!olderTurns) return NextResponse.json({ error: { message: "Thiếu olderTurns" } }, { status: 400 });
  const summary = await summarizeConversation(olderTurns, { existingSummaryJson, provider, model });
  if (worldId && isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      try { await supabase.from("conversation_summaries").upsert({ world_id: worldId, summary, updated_at: new Date().toISOString() }); } catch {}
    }
  }
  return NextResponse.json({ summary });
}
