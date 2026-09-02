import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 200);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  if (!isSupabaseConfigured()) return NextResponse.json({ session: null, turns: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ session: null, turns: [] });
  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  const { data: turns } = await supabase.from("conversation_turns").select("id, session_id, role, text, timestamp, duration_ms").eq("session_id", id).order("timestamp", { ascending: true }).range(offset, offset + limit - 1);
  return NextResponse.json({ session, turns: turns || [] });
}
