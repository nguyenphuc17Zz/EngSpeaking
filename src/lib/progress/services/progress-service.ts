import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DimensionHistoryPoint, SkillHistoryPoint } from "@/types/progress";

export async function getDimensionHistory(range: string, learnerId = "default"): Promise<DimensionHistoryPoint[]> {
  if (!isSupabaseConfigured()) {
    // Fallback: try to synthesize from speaking_evaluations if configured, else empty
    return [];
  }
  const supabase = createServerClient()!;
  const since = rangeToSince(range);
  const { data } = await supabase.from("dimension_snapshots").select("*").eq("learner_state_id", learnerId).gte("captured_at", since.toISOString()).order("captured_at", { ascending: true }).limit(200);
  if (data && data.length) return data.map((d) => ({ capturedAt: d.captured_at, overall: d.overall, dimensions: d.dimensions, evaluationId: d.evaluation_id, sessionId: d.session_id }));
  // Fallback to speaking_evaluations
  const { data: evals } = await supabase.from("speaking_evaluations").select("overall_practice_score, dimensions, generated_at, id, session_id").gte("generated_at", since.toISOString()).order("generated_at", { ascending: true }).limit(200);
  return (evals || []).map((e) => ({ capturedAt: e.generated_at, overall: e.overall_practice_score, dimensions: e.dimensions, evaluationId: e.id, sessionId: e.session_id }));
}

export async function getSkillHistory(skillId: string, range: string, learnerId = "default"): Promise<SkillHistoryPoint[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServerClient()!;
  const since = rangeToSince(range);
  const { data } = await supabase.from("skill_history").select("*").eq("learner_state_id", learnerId).eq("skill_id", skillId).gte("captured_at", since.toISOString()).order("captured_at", { ascending: true }).limit(200);
  return (data || []).map((d) => ({ capturedAt: d.captured_at, skillId: d.skill_id, mastery: d.mastery, confidence: d.confidence, retentionRisk: d.retention_risk, trend: d.trend, practiceCount: d.practice_count, sourceSessionId: d.source_session_id }));
}

export async function getMilestones(learnerId = "default"): Promise<import("@/types/progress").LearningMilestone[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServerClient()!;
  const { data } = await supabase.from("learning_milestones").select("*").eq("learner_state_id", learnerId).order("achieved_at", { ascending: true }).limit(100);
  return data || [];
}

export async function getInterventionEffectiveness(skillId?: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServerClient()!;
  let q = supabase.from("intervention_outcomes").select("*").order("created_at", { ascending: false }).limit(50);
  if (skillId) q = q.eq("skill_id", skillId);
  const { data } = await q;
  return data || [];
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000); // 30d default
}
