import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

// For anonymous, progress is localStorage-driven; this endpoint aggregates foundation_attempts for history
export async function GET(req: Request) {
  const url = new URL(req.url);
  const skill = url.searchParams.get("skill");
  if (!isSupabaseConfigured()) return NextResponse.json({ progress: null, history: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ progress: null, history: [] });

  // Aggregate recent attempts per skill if DB available
  let query = supabase.from("foundation_attempts").select("*, foundation_sessions!inner(skill)").order("created_at", { ascending: false }).limit(50);
  // Supabase join filter not trivial for anonymous; just return recent attempts
  const { data: attempts } = await query;
  let filtered = attempts || [];
  if (skill) {
    // filter in memory by skill via session lookup
    const { data: sessions } = await supabase.from("foundation_sessions").select("id, skill").eq("skill", skill);
    const ids = new Set((sessions || []).map((s) => s.id));
    filtered = (attempts || []).filter((a) => ids.has(a.session_id));
  }
  return NextResponse.json({ history: filtered });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { skill, overall, translationDependency } = body as { skill?: string; overall?: number; translationDependency?: number };
  // Server just echoes; real profile is in localStorage per progress.service
  return NextResponse.json({ ok: true, skill, overall, translationDependency });
}
