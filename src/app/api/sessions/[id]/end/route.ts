import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ session: { id, ended_at: new Date().toISOString(), status: "completed" } });
  }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ error: { message: "Supabase not configured" } }, { status: 503 });
  const { data, error } = await supabase.from("sessions").update({ ended_at: new Date().toISOString(), status: "completed" }).eq("id", id).select().single();
  if (error) {
    logger.error({ error: error.message });
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}
