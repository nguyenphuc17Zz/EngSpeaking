import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ evaluation: null });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ evaluation: null });
  const { data } = await supabase.from("speaking_evaluations").select("*").eq("id", id).single();
  if (!data) return NextResponse.json({ evaluation: null });
  // Fetch related
  const { data: turns } = await supabase.from("turn_evaluations").select("*").eq("evaluation_id", data.id);
  const { data: issues } = await supabase.from("diagnostic_issues").select("*").eq("evaluation_id", data.id);
  return NextResponse.json({ evaluation: data.evaluation, snapshot: data.snapshot, turns, issues });
}
