import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { exerciseId, mode = "practice", skill, difficulty, exerciseType } = body as {
    exerciseId?: string;
    mode?: string;
    skill?: string;
    difficulty?: number;
    exerciseType?: string;
  };
  const id = `fsess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const payload = {
    id,
    exercise_id: exerciseId || "unknown",
    mode,
    skill: skill || "sentence_retrieval",
    difficulty: difficulty ?? 5,
    exercise_type: exerciseType || "one_sentence",
    started_at: new Date().toISOString(),
    status: "active",
  };
  if (!isSupabaseConfigured()) return NextResponse.json({ session: { ...payload, created_at: payload.started_at } });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ session: payload });
  const { data, error } = await supabase.from("foundation_sessions").insert(payload).select().single();
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  if (!isSupabaseConfigured()) return NextResponse.json({ sessions: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ sessions: [] });
  const { data } = await supabase.from("foundation_sessions").select("*").order("started_at", { ascending: false }).limit(limit);
  // also fetch attempts count
  return NextResponse.json({ sessions: data || [] });
}
