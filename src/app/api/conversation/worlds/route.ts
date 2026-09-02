import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    if (!isSupabaseConfigured()) return NextResponse.json({ world: null, turns: [], facts: [], events: [], summary: null });
    const supabase = createServerClient();
    if (!supabase) return NextResponse.json({ world: null });
    const { data: world } = await supabase.from("conversation_worlds").select("*").eq("id", id).single();
    const { data: turns } = await supabase.from("conversation_turns_world").select("*").eq("world_id", id).order("timestamp", { ascending: true });
    const { data: facts } = await supabase.from("conversation_facts").select("*").eq("world_id", id);
    const { data: events } = await supabase.from("conversation_events").select("*").eq("world_id", id);
    const { data: summary } = await supabase.from("conversation_summaries").select("*").eq("world_id", id).single();
    return NextResponse.json({ world, turns: turns || [], facts: facts || [], events: events || [], summary: summary?.summary || null });
  }
  // list
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
  if (!isSupabaseConfigured()) return NextResponse.json({ worlds: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ worlds: [] });
  const { data } = await supabase.from("conversation_worlds").select("*").order("created_at", { ascending: false }).limit(limit);
  return NextResponse.json({ worlds: data || [] });
}
