import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skillId = url.searchParams.get("skillId") || url.searchParams.get("skill");
  const range = url.searchParams.get("range") || "30d";
  if (!isSupabaseConfigured()) return NextResponse.json({ history: [] });
  const supabase = createServerClient()!;
  const since = rangeToSince(range);
  let query = supabase.from("skill_history").select("*").gte("captured_at", since.toISOString()).order("captured_at", { ascending: true }).limit(100);
  if (skillId) query = query.eq("skill_id", skillId);
  const { data } = await query;
  return NextResponse.json({ history: data || [] });
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000);
}
