import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { role, text, timestamp, durationMs } = body as { role?: string; text?: string; timestamp?: string; durationMs?: number };

  if (!role || !text) return NextResponse.json({ error: { message: "Thiếu role/text" } }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ turn: { id: `local_${Date.now()}`, session_id: sessionId, role, text, timestamp: timestamp || new Date().toISOString(), duration_ms: durationMs || null } });
  }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: { message: "Supabase not configured" } }, { status: 503 });

  const turn = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    role,
    text,
    timestamp: timestamp || new Date().toISOString(),
    duration_ms: durationMs ?? null,
  };
  const { data, error } = await supabase.from("conversation_turns").insert(turn).select().single();
  if (error) {
    logger.error({ error: error.message });
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ turn: data });
}
