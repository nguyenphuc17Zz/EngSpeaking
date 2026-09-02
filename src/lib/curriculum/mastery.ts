// Mastery model §9-13 — continuous, evidence-based, recency decay, retention risk
import type { SkillState } from "@/types/learner";

const DECAY_LAMBDA = 0.03; // per day

export function updateMastery(
  prev: SkillState,
  performance: number, // 0-1
  evidenceConfidence: number // 0-1
): { mastery: number; confidence: number } {
  // Evidence-based weighted update §10-11
  const perf01 = Math.max(0, Math.min(1, performance));
  const evConf = Math.max(0, Math.min(1, evidenceConfidence));
  // Mastery moves toward performance, weighted by confidence
  const delta = (perf01 - prev.mastery) * (0.25 + evConf * 0.35);
  const mastery = Math.max(0, Math.min(1, prev.mastery + delta));
  // Confidence increases with evidence
  const confDelta = evConf * 0.15 - (1 - evConf) * 0.05;
  const confidence = Math.max(0.1, Math.min(0.95, prev.confidence + confDelta));
  return { mastery, confidence };
}

export function applyRecencyDecay(skill: SkillState, now = new Date()): SkillState {
  if (!skill.lastPracticedAt) return skill;
  const days = (now.getTime() - new Date(skill.lastPracticedAt).getTime()) / 86400000;
  if (days <= 0) return skill;
  const decay = Math.exp(-DECAY_LAMBDA * days); // §12
  // Decay mastery slightly toward 0.5 (forget toward average, not zero)
  const decayedMastery = skill.mastery * decay + 0.5 * (1 - decay) * 0.1;
  return { ...skill, mastery: decayedMastery };
}

export function computeRetentionRisk(skill: SkillState, now = new Date()): number {
  if (!skill.lastPracticedAt) return 0.6;
  const days = (now.getTime() - new Date(skill.lastPracticedAt).getTime()) / 86400000;
  const recency = Math.min(1, days / 14); // 0-14 days → 0-1
  const masteryFactor = skill.mastery > 0.7 ? 0.3 : skill.mastery < 0.4 ? 0.8 : 0.5;
  const frequencyFactor = skill.practiceCount < 3 ? 0.7 : skill.practiceCount < 8 ? 0.4 : 0.2;
  return Math.max(0, Math.min(1, recency * 0.5 + masteryFactor * 0.3 + frequencyFactor * 0.2));
}

export function computeTrend(recentScores: number[]): SkillState["trend"] {
  if (recentScores.length < 3) return "unknown";
  const last = recentScores.slice(-3);
  const diff1 = last[1] - last[0];
  const diff2 = last[2] - last[1];
  if (diff1 > 0.05 && diff2 > 0.03) return "improving";
  if (diff1 < -0.05 && diff2 < -0.03) return "declining";
  if (Math.abs(diff1) < 0.04 && Math.abs(diff2) < 0.04) return "stable";
  return "unknown";
}

export function canPromote(skill: SkillState, recentScores: number[]): boolean {
  // §37: consistently good + confidence + multi-context (approx via practiceCount)
  if (skill.confidence < 0.6) return false;
  if (recentScores.length < 3) return false;
  const avg = recentScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return avg > 0.75 && skill.practiceCount >= 4;
}

export function shouldDemote(skill: SkillState, recentScores: number[]): boolean {
  if (recentScores.length < 3) return false;
  const avg = recentScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return avg < 0.45 && skill.mastery > 0.5;
}
