import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ evaluation: null });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ evaluation: null });
  const { data } = await supabase.from("speaking_evaluations").select("*").order("generated_at", { ascending: false }).limit(1).single();
  if (!data) return NextResponse.json({ evaluation: null });
  return NextResponse.json({ evaluation: data.evaluation, snapshot: data.snapshot });
}
