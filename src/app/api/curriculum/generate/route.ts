import { NextResponse } from "next/server";
import { buildLearningSession, explainPlan } from "@/lib/curriculum/decision-engine";
import { validateLearningPlan } from "@/lib/curriculum/validation";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { LearnerState } from "@/types/learner";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { learnerState, duration = 10, goalOverride, provider = "gemini", model = "auto" } = body as {
    learnerState?: LearnerState;
    duration?: number;
    goalOverride?: string;
    provider?: string;
    model?: string;
  };
  if (!learnerState) return NextResponse.json({ error: { message: "Thiếu learnerState" } }, { status: 400 });
  const plan = await buildLearningSession(learnerState as LearnerState, duration, { goalOverride }, { provider, model });
  const validation = validateLearningPlan(plan);
  if (!validation.valid) {
    return NextResponse.json({ error: { message: "Plan invalid", details: validation.errors }, plan }, { status: 422 });
  }
  const explanation = await explainPlan(plan, plan.primarySkill || "general", { provider, model });

  // Persist plan snapshot (anonymous)
  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      try {
        await supabase.from("learning_plans").insert({
          id: plan.id,
          learner_state_id: "default_learner",
          title: plan.title,
          objective: plan.objective,
          estimated_duration_minutes: plan.estimatedDurationMinutes,
          primary_skill: plan.primarySkill,
          secondary_skills: plan.secondarySkills || [],
          expected_outcome: plan.expectedOutcome,
          plan_version: plan.planVersion,
          generated_at: plan.generatedAt,
          generation_reason: plan.generationReason,
          teacher_version: plan.teacherVersion,
          schema_version: plan.schemaVersion,
          blocks: plan.blocks,
        });
        for (let i = 0; i < plan.blocks.length; i++) {
          const b = plan.blocks[i];
          await supabase.from("learning_blocks").insert({
            id: b.id,
            plan_id: plan.id,
            type: b.type,
            skill_id: b.skillId,
            exercise_type: b.exerciseType,
            duration_minutes: b.durationMinutes,
            difficulty: b.difficulty,
            rationale: b.rationale,
            order_index: i,
          });
        }
      } catch {}
    }
  }

  return NextResponse.json({ plan, explanation });
}
