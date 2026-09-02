import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: { message: "Thiếu sessionId" } }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ snapshot: null });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ snapshot: null });
  const { data } = await supabase.from("speaking_evaluations").select("snapshot").eq("session_id", sessionId).order("generated_at", { ascending: false }).limit(1).single();
  return NextResponse.json({ snapshot: data?.snapshot || null });
}

// For Phase 5 contract
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { sessionId } = body as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: { message: "Thiếu sessionId" } }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ snapshot: null });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ snapshot: null });
  const { data } = await supabase.from("speaking_evaluations").select("snapshot").eq("session_id", sessionId).order("generated_at", { ascending: false }).limit(1).single();
  return NextResponse.json({ snapshot: data?.snapshot || null });
}
