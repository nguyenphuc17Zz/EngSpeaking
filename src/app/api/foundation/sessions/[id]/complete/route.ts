import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ session: { id, status: "completed", completed_at: new Date().toISOString() } });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ session: { id, status: "completed" } });
  const { data, error } = await supabase.from("foundation_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ session: data });
}
