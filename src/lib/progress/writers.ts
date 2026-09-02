import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function writeSkillHistory(learnerId: string, skillId: string, mastery: number, confidence: number, retentionRisk?: number, trend?: string, practiceCount?: number, sourceSessionId?: string) {
  if (!isSupabaseConfigured()) return;
  const supabase = createServerClient()!;
  await supabase.from("skill_history").insert({
    id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
    learner_state_id: learnerId,
    skill_id: skillId,
    mastery, confidence, retention_risk: retentionRisk, trend, practice_count: practiceCount || 0, source_session_id: sourceSessionId,
  });
}

export async function writeDimensionSnapshot(learnerId: string, dimensions: Record<string, number>, overall: number, evaluationId?: string, sessionId?: string) {
  if (!isSupabaseConfigured()) return;
  const supabase = createServerClient()!;
  await supabase.from("dimension_snapshots").insert({
    id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
    learner_state_id: learnerId,
    dimensions, overall, evaluation_id: evaluationId, session_id: sessionId,
  });
}

export async function writeMilestones(learnerId: string, milestones: Array<{ type: string; title: string; description: string; evidenceSessionId?: string; skillIds?: string[]; significance: "minor" | "major" }>) {
  if (!isSupabaseConfigured() || !milestones.length) return;
  const supabase = createServerClient()!;
  for (const m of milestones) {
    await supabase.from("learning_milestones").insert({
      id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
      learner_state_id: learnerId,
      type: m.type,
      title: m.title,
      description: m.description,
      evidence_session_id: m.evidenceSessionId,
      skill_ids: m.skillIds || [],
      significance: m.significance,
    });
  }
}

export async function writeInterventionOutcome(skillId: string, exerciseType: string, beforeScore: number, afterScore: number) {
  if (!isSupabaseConfigured()) return;
  const supabase = createServerClient()!;
  await supabase.from("intervention_outcomes").insert({
    id: `io_${Date.now()}`,
    skill_id: skillId,
    exercise_type: exerciseType,
    before_score: beforeScore,
    after_score: afterScore,
    improvement: afterScore - beforeScore,
    confidence: 0.6,
  });
}
