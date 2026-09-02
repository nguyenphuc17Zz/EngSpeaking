import { NextResponse } from "next/server";
import { evaluateSession } from "@/lib/diagnostics/services/evaluation.service";
import { toUserMessage } from "@/lib/errors/codes";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { sessionId, sessionType, turns, provider = "gemini", model = "auto", hasAudio = false, force = false } = body as {
    sessionId?: string;
    sessionType?: string;
    turns?: Array<{ turnId: string; transcript: string; rawText?: string; timestamp?: string; durationMs?: number; timeToFirstWordMs?: number; confidence?: number }>;
    provider?: string;
    model?: string;
    hasAudio?: boolean;
    force?: boolean;
  };
  if (!sessionId || !turns || !Array.isArray(turns) || turns.length === 0) {
    return NextResponse.json({ error: { message: "Thiếu sessionId hoặc turns" } }, { status: 400 });
  }
  try {
    const { evaluation, snapshot } = await evaluateSession(sessionId, turns, { sessionType, provider, model, force, hasAudio });
    return NextResponse.json({ evaluation, snapshot });
  } catch (e: unknown) {
    // Partial evaluation fallback — still return deterministic part
    return NextResponse.json({ error: { message: toUserMessage(e) } }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: { message: "Thiếu sessionId" } }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ evaluation: null, snapshot: null });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ evaluation: null });
  const { data } = await supabase.from("speaking_evaluations").select("*").eq("session_id", sessionId).order("generated_at", { ascending: false }).limit(1).single();
  if (!data) return NextResponse.json({ evaluation: null });
  return NextResponse.json({ evaluation: data.evaluation, snapshot: data.snapshot });
}
