import { NextResponse } from "next/server";
import { buildAdvancedSession } from "@/lib/advanced/session-builder";
import { validateAdvancedSession } from "@/lib/advanced/validation";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { advancedTrainingContextSchema } from "@/lib/validation/advanced-schemas";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { context, provider = "gemini", model = "auto" } = body as { context?: unknown; provider?: string; model?: string };
  const parsed = advancedTrainingContextSchema.safeParse(context);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid context", details: parsed.error.flatten() } }, { status: 400 });
  const session = await buildAdvancedSession(parsed.data, { provider, model });
  const validation = validateAdvancedSession(session);
  if (!validation.valid) return NextResponse.json({ error: { message: "Invalid session", details: validation.errors }, session }, { status: 422 });

  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      try {
        await supabase.from("advanced_training_sessions").insert({
          id: session.id, mode: session.modules[0] || "advanced", primary_skill: session.blocks[0]?.skillTargets?.[0] || null,
          secondary_skills: session.blocks.slice(1).flatMap((b) => b.skillTargets).slice(0, 5),
          estimated_duration: session.estimatedDurationMinutes, difficulty: session.context.difficulty || {}, pressure: session.context.pressureLevel || null,
          topic: session.context.topic || null, scenario: session.context.scenario ? { scenario: session.context.scenario } : {}, plan: session,
        });
        for (let i = 0; i < session.blocks.length; i++) {
          const b = session.blocks[i];
          await supabase.from("advanced_training_blocks").insert({
            id: b.id, session_id: session.id, type: b.type, objective: b.objective, skill_targets: b.skillTargets, difficulty: b.difficulty,
            estimated_duration: b.estimatedDurationMinutes, instructions: b.instructions, scenario: b.scenario || {}, constraints: b.constraints || [], order_index: i,
          });
        }
        for (const c of session.challenges) {
          await supabase.from("advanced_training_challenges").insert({ id: c.id, session_id: session.id, type: c.type, trigger: c.trigger, purpose: c.purpose, effect: c.effect });
        }
      } catch {}
    }
  }

  return NextResponse.json({ session, rationale: session.rationale });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id && isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      const { data } = await supabase.from("advanced_training_sessions").select("*").eq("id", id).single();
      if (data) return NextResponse.json({ session: data.plan });
    }
  }
  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
      const { data } = await supabase.from("advanced_training_sessions").select("id, primary_skill, estimated_duration, created_at").order("created_at", { ascending: false }).limit(limit);
      return NextResponse.json({ sessions: data || [] });
    }
  }
  return NextResponse.json({ sessions: [] });
}
