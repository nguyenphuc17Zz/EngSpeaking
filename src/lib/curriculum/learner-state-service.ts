// LearnerState service with versioning §52-53, anonymous persistence
import type { LearnerState, LearnerStateChange, SkillState, LearningGoalId } from "@/types/learner";
import { computeRetentionRisk, applyRecencyDecay, updateMastery, computeTrend } from "./mastery";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { writeSkillHistory } from "@/lib/progress/writers";

const STORAGE_KEY = "learner_state_v1";
const CHANGES_KEY = "learner_state_changes";

function defaultSpeakingProfile(): LearnerState["speakingProfile"] {
  return {
    fluency: 50, grammar: 60, vocabulary: 65, naturalness: 50, responseSpeed: 45, pronunciation: 55, communication: 55, confidenceIndicators: 50, sentenceRetrieval: 45, automaticity: 40, recovery: 45, elaboration: 40,
  };
}

function defaultSkills(): SkillState[] {
  const ids = ["sentence_retrieval","chunk_retrieval","sentence_construction","sentence_expansion","substitution","speaking_repetition","shadowing","controlled_speaking","response_speed","active_vocabulary","grammar_in_speech","conversation_followup","micro_monologue","recovery","self_correction","confidence","free_conversation","clarification","persuasion"];
  return ids.map((id) => ({
    skillId: id, mastery: 0.45, confidence: 0.3, recentPerformance: 0.5, trend: "unknown" as const, practiceCount: 0, successfulAttempts: 0, failedAttempts: 0, currentDifficulty: 5, retentionRisk: 0.3,
  }));
}

export function createDefaultLearnerState(): LearnerState {
  return {
    speakingProfile: defaultSpeakingProfile(),
    skills: defaultSkills(),
    weaknesses: [],
    strengths: [],
    goals: [{ id: "general" as LearningGoalId, label: "General speaking", isPrimary: true }],
    recentPerformance: {},
    practiceHistory: { totalSessions: 0, lastSessions: [] },
    preferences: { preferredSessionLength: 10, difficultyPreference: "auto", challengeTolerance: "medium", feedbackVerbosity: "concise" },
    curriculumState: { consecutiveSuccessfulSessions: 0, consecutiveFailedSessions: 0, recentlyCompletedSkills: [], upcomingReviewSkills: [] },
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function loadLearnerState(): LearnerState {
  if (typeof window === "undefined") return createDefaultLearnerState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LearnerState;
      // Apply decay on load
      parsed.skills = parsed.skills.map((s) => applyRecencyDecay(s));
      return parsed;
    }
  } catch {}
  return createDefaultLearnerState();
}

export function saveLearnerState(state: LearnerState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function logStateChange(change: LearnerStateChange): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CHANGES_KEY);
    const arr: LearnerStateChange[] = raw ? JSON.parse(raw) : [];
    arr.push(change);
    localStorage.setItem(CHANGES_KEY, JSON.stringify(arr.slice(-50)));
  } catch {}
}

export function updateSkillFromPerformance(
  state: LearnerState,
  skillId: string,
  performance01: number,
  evidenceConfidence: number,
  sourceSessionId?: string
): LearnerState {
  const idx = state.skills.findIndex((s) => s.skillId === skillId);
  if (idx === -1) return state;
  const prev = state.skills[idx];
  const { mastery, confidence } = updateMastery(prev, performance01, evidenceConfidence);
  const newSkill: SkillState = {
    ...prev,
    mastery, confidence,
    recentPerformance: performance01,
    lastPracticedAt: new Date().toISOString(),
    practiceCount: prev.practiceCount + 1,
    successfulAttempts: prev.successfulAttempts + (performance01 > 0.6 ? 1 : 0),
    failedAttempts: prev.failedAttempts + (performance01 <= 0.4 ? 1 : 0),
    retentionRisk: computeRetentionRisk({ ...prev, lastPracticedAt: new Date().toISOString() }),
  };
  // Trend from last 3
  const recent = [...(prev as unknown as { recentScores?: number[] }).recentScores || [], performance01].slice(-3) as number[];
  (newSkill as unknown as Record<string, unknown>).recentScores = recent;
  newSkill.trend = computeTrend(recent);

  const changes: LearnerStateChange[] = [{
    field: `skills.${skillId}.mastery`,
    previousValue: prev.mastery,
    newValue: mastery,
    reason: `performance ${performance01.toFixed(2)} via ${sourceSessionId || "session"}`,
    sourceSessionId,
    timestamp: new Date().toISOString(),
  }];
  changes.forEach(logStateChange);

  const next: LearnerState = { ...state, skills: state.skills.map((s, i) => i === idx ? newSkill : s), version: state.version + 1, updatedAt: new Date().toISOString() };
  saveLearnerState(next);
  // Phase 8: also write skill_history for long-term analytics (fire-and-forget)
  try { void writeSkillHistory("default", skillId, mastery, confidence, newSkill.retentionRisk, newSkill.trend, newSkill.practiceCount, sourceSessionId); } catch {}
  return next;
}

export function updateLearnerStateFromEvaluation(
  state: LearnerState,
  evaluation: { dimensions: Record<string, number>; overallPracticeScore: number; primaryBottleneck?: string },
  sessionId?: string
): LearnerState {
  let next = { ...state };
  // Update speakingProfile from dimensions
  for (const [k, v] of Object.entries(evaluation.dimensions)) {
    if (k in next.speakingProfile) {
      const key = k as keyof LearnerState["speakingProfile"];
      const prev = (next.speakingProfile as unknown as Record<string, number>)[key] || 50;
      (next.speakingProfile as unknown as Record<string, number>)[key] = Math.round(prev * 0.7 + v * 0.3);
    }
  }
  next.version += 1;
  next.updatedAt = new Date().toISOString();
  next.practiceHistory = { totalSessions: next.practiceHistory.totalSessions + 1, lastSessions: [...next.practiceHistory.lastSessions.slice(-9), { sessionId: sessionId || `sess_${Date.now()}`, skillId: evaluation.primaryBottleneck || "general", score: evaluation.overallPracticeScore / 100, at: new Date().toISOString() }] };
  saveLearnerState(next);
  return next;
}

export function getCompactSnapshot(state: LearnerState): import("@/types/learner").LearnerStateSnapshot {
  const sorted = [...state.skills].sort((a, b) => a.mastery - b.mastery);
  const reviewCandidates = state.skills.filter((s) => (s.retentionRisk || 0) > 0.6).map((s) => s.skillId);
  return {
    goals: state.goals.map((g) => g.id),
    primaryBottleneck: state.weaknesses[0]?.skillId || sorted[0]?.skillId,
    secondaryBottlenecks: state.weaknesses.slice(1, 3).map((w) => w.skillId),
    topStrengths: state.strengths.slice(0, 3).map((s) => s.skillId),
    dimensions: state.speakingProfile as unknown as Record<string, number>,
    skillPriorities: sorted.slice(0, 5).map((s) => ({ skillId: s.skillId, mastery: s.mastery, trend: s.trend })),
    recentChanges: [],
    reviewCandidates,
    constraints: [`sessionLength:${state.preferences.preferredSessionLength || 10}`, `difficulty:${state.preferences.difficultyPreference || "auto"}`],
  };
}
