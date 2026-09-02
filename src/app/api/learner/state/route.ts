import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createDefaultLearnerState } from "@/lib/curriculum/learner-state-service";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ state: createDefaultLearnerState(), source: "default" });
  }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ state: createDefaultLearnerState() });
  const { data } = await supabase.from("learner_states").select("*").order("updated_at", { ascending: false }).limit(1).single();
  if (!data) return NextResponse.json({ state: createDefaultLearnerState() });
  // Reconstruct LearnerState from DB row
  const state = {
    speakingProfile: data.speaking_profile,
    skills: data.skills,
    weaknesses: [],
    strengths: [],
    goals: data.goals || [],
    recentPerformance: {},
    practiceHistory: { totalSessions: 0, lastSessions: [] },
    preferences: data.preferences,
    curriculumState: data.curriculum_state,
    version: data.version,
    updatedAt: data.updated_at,
  };
  return NextResponse.json({ state });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { state } = body as { state?: unknown };
  if (!state) return NextResponse.json({ error: { message: "Thiếu state" } }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, state });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ ok: true });
  const s = state as import("@/types/learner").LearnerState;
  try {
    await supabase.from("learner_states").upsert({
      id: "default_learner",
      profile: s.speakingProfile,
      skills: s.skills,
      goals: s.goals,
      preferences: s.preferences,
      curriculum_state: s.curriculumState,
      speaking_profile: s.speakingProfile,
      version: s.version,
      updated_at: new Date().toISOString(),
    });
  } catch {}
  return NextResponse.json({ ok: true });
}
