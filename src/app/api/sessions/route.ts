import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

// POST /api/sessions — create session
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { provider, model, sttProvider, sttModel, ttsProvider, ttsModel } = (body as Record<string, string>) || {};

  if (!isSupabaseConfigured()) {
    // In-memory fallback — return ephemeral id
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.sessionStarted({ id, fallback: "memory" });
    return NextResponse.json({ session: { id, started_at: new Date().toISOString(), status: "active", provider, model, stt_provider: sttProvider, stt_model: sttModel, tts_provider: ttsProvider, tts_model: ttsModel } });
  }

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: { message: "Supabase not configured" } }, { status: 503 });

  const id = crypto.randomUUID();
  const payload = {
    id,
    started_at: new Date().toISOString(),
    status: "active",
    provider: provider || null,
    model: model || null,
    stt_provider: sttProvider || null,
    stt_model: sttModel || null,
    tts_provider: ttsProvider || null,
    tts_model: ttsModel || null,
  };
  const { data, error } = await supabase.from("sessions").insert(payload).select().single();
  if (error) {
    logger.error({ error: error.message });
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
  logger.sessionStarted({ id });
  return NextResponse.json({ session: data });
}

// GET /api/sessions — list recent
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ sessions: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ sessions: [] });
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  const { data, error } = await supabase.from("sessions").select("*").order("started_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ sessions: data });
}
