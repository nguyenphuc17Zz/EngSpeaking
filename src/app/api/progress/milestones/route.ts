import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ milestones: [] });
  const supabase = createServerClient()!;
  const { data } = await supabase.from("learning_milestones").select("*").order("achieved_at", { ascending: true }).limit(100);
  return NextResponse.json({ milestones: data || [] });
}
