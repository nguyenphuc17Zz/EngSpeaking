import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  if (!isSupabaseConfigured()) return NextResponse.json({ plans: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ plans: [] });
  const { data } = await supabase.from("learning_plans").select("*").order("generated_at", { ascending: false }).limit(limit);
  return NextResponse.json({ plans: data || [] });
}
