import { progressRepo } from "@/lib/db/sqlite-db";

export async function writeSkillHistory(learnerId: string, skillId: string, mastery: number, confidence: number, retentionRisk?: number, trend?: string, practiceCount?: number, sourceSessionId?: string) {
  progressRepo.recordSkillHistory({
    learner_state_id: learnerId,
    skill_id: skillId,
    mastery,
    confidence,
    retention_risk: retentionRisk ?? null,
    trend: trend ?? null,
    practice_count: practiceCount || 1,
    source_session_id: sourceSessionId,
  });
}

export async function writeDimensionSnapshot(learnerId: string, dimensions: Record<string, number>, overall: number, evaluationId?: string, sessionId?: string) {
  progressRepo.recordDimensionSnapshot({
    learner_state_id: learnerId,
    dimensions,
    overall,
    evaluation_id: evaluationId,
    session_id: sessionId,
  });
}

export async function writeMilestones(learnerId: string, milestones: Array<{ type: string; title: string; description: string; evidenceSessionId?: string; skillIds?: string[]; significance: "minor" | "major" }>) {
  for (const m of milestones) {
    progressRepo.recordMilestone({
      learner_state_id: learnerId,
      type: m.type,
      title: m.title,
      description: m.description,
      evidence_session_id: m.evidenceSessionId,
      skill_ids: m.skillIds,
      significance: m.significance,
    });
  }
}

export async function writeInterventionOutcome(skillId: string, exerciseType: string, beforeScore: number, afterScore: number) {
  progressRepo.recordInterventionOutcome({
    skill_id: skillId,
    exercise_type: exerciseType,
    before_score: beforeScore,
    after_score: afterScore,
    improvement: afterScore - beforeScore,
    confidence: 0.6,
  });
}

