import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  if (!isSupabaseConfigured()) return NextResponse.json({ history: [] });
  const supabase = createServerClient()!;
  const { data } = await supabase.from("dimension_snapshots").select("*").order("captured_at", { ascending: false }).limit(limit);
  return NextResponse.json({ history: data || [] });
}
