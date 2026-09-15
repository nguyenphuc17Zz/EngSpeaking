import { progressRepo, evaluationRepo } from "@/lib/db/sqlite-db";
import type { DimensionHistoryPoint, SkillHistoryPoint } from "@/types/progress";

export async function getDimensionHistory(range: string, learnerId = "default"): Promise<DimensionHistoryPoint[]> {
  const since = rangeToSince(range);
  const data = progressRepo.getDimensionSnapshots(learnerId, since);
  if (data && data.length) {
    return data.map((d) => ({
      capturedAt: d.captured_at,
      overall: d.overall,
      dimensions: d.dimensions,
      evaluationId: d.evaluation_id,
      sessionId: d.session_id,
    }));
  }

  // Fallback to speaking_evaluations
  const evals = evaluationRepo.listSince(since, 200);
  return evals.map((e) => ({
    capturedAt: e.generated_at,
    overall: e.overall_practice_score,
    dimensions: e.dimensions,
    evaluationId: e.id,
    sessionId: e.session_id,
  }));
}

export async function getSkillHistory(skillId: string, range: string, learnerId = "default"): Promise<SkillHistoryPoint[]> {
  const since = rangeToSince(range);
  const data = progressRepo.getSkillHistory(learnerId, skillId, since);
  return (data || []).map((d) => ({
    capturedAt: d.captured_at,
    skillId: d.skill_id,
    mastery: d.mastery,
    confidence: d.confidence,
    retentionRisk: d.retention_risk,
    trend: d.trend,
    practiceCount: d.practice_count,
    sourceSessionId: d.source_session_id,
  }));
}

export async function getMilestones(learnerId = "default"): Promise<import("@/types/progress").LearningMilestone[]> {
  const data = progressRepo.getMilestones(learnerId);
  return data || [];
}

export async function getInterventionEffectiveness(skillId?: string) {
  const data = progressRepo.getInterventionOutcomes(50);
  if (skillId) {
    return data.filter((item) => item.skill_id === skillId);
  }
  return data;
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000); // 30d default
}

