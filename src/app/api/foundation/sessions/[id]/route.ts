import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ session: null, attempts: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ session: null, attempts: [] });
  const { data: session } = await supabase.from("foundation_sessions").select("*").eq("id", id).single();
  const { data: attempts } = await supabase.from("foundation_attempts").select("*").eq("session_id", id).order("created_at", { ascending: true });
  return NextResponse.json({ session, attempts: attempts || [] });
}
