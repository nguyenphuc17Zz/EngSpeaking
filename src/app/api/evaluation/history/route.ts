import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  if (!isSupabaseConfigured()) return NextResponse.json({ evaluations: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ evaluations: [] });
  const { data } = await supabase.from("speaking_evaluations").select("id, session_id, session_type, overall_practice_score, confidence, completeness, generated_at, provider, model").order("generated_at", { ascending: false }).limit(limit);
  return NextResponse.json({ evaluations: data || [] });
}
