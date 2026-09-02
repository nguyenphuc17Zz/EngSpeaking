import type { LearningMilestone } from "@/types/progress";

export function evaluateMilestones(opts: {
  skillHistory: Array<{ skillId: string; mastery: number; practiceCount: number }>;
  sessionCount: number;
  hasRoleplay: boolean;
  hasPressureSuccess: boolean;
  existing: LearningMilestone[];
}): LearningMilestone[] {
  const achieved = new Set(opts.existing.map((m: LearningMilestone) => m.type));
  const now = new Date().toISOString();
  const res: LearningMilestone[] = [];

  const already = (type: string) => achieved.has(type);

  if (!already("first_complete_spoken_answer") && opts.sessionCount >= 1) {
    res.push({ id: `ms_${Date.now()}_1`, type: "first_complete_spoken_answer", title: "First complete spoken answer", description: "You completed your first spoken answer.", achievedAt: now, significance: "minor" });
  }
  if (!already("first_30_second_speech") && opts.skillHistory.some((s) => s.mastery > 0.3)) {
    res.push({ id: `ms_${Date.now()}_2`, type: "first_30_second_speech", title: "First 30-second speech", description: "You spoke continuously for 30 seconds.", achievedAt: now, significance: "minor" });
  }
  if (!already("first_1_minute_speech") && opts.skillHistory.some((s) => s.mastery > 0.5 && s.practiceCount >= 5)) {
    res.push({ id: `ms_${Date.now()}_3`, type: "first_1_minute_speech", title: "First 1-minute speech", description: "You sustained speech for 1 minute.", achievedAt: now, significance: "major" });
  }
  if (!already("first_5_session_streak") && opts.sessionCount >= 5) {
    res.push({ id: `ms_${Date.now()}_4`, type: "streak_5", title: "5-session streak", description: "You completed 5 sessions.", achievedAt: now, significance: "major" });
  }
  if (!already("mastery_70") && opts.skillHistory.some((s) => s.mastery >= 0.7)) {
    const skill = opts.skillHistory.find((s) => s.mastery >= 0.7)!;
    res.push({ id: `ms_${Date.now()}_5`, type: "mastery_70", title: `Mastery 70% — ${skill.skillId}`, description: `You reached 70% mastery in ${skill.skillId}.`, achievedAt: now, skillIds: [skill.skillId], significance: "major" });
  }
  if (!already("first_dynamic_roleplay_completion") && opts.hasRoleplay) {
    res.push({ id: `ms_${Date.now()}_6`, type: "first_dynamic_roleplay_completion", title: "First dynamic roleplay", description: "You completed a dynamic roleplay.", achievedAt: now, significance: "major" });
  }
  if (!already("first_successful_pressure_session") && opts.hasPressureSuccess) {
    res.push({ id: `ms_${Date.now()}_7`, type: "first_successful_pressure_session", title: "First pressure success", description: "You succeeded under pressure.", achievedAt: now, significance: "major" });
  }
  return res;
}
