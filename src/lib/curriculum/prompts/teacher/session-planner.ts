export const SESSION_PLANNER_SYSTEM = `You build learning session plan. Be concise, respect duration, vary exercise types. Return ONLY JSON matching LearningSessionPlan.`;
export function buildSessionPlannerPrompt(snapshotJson: string, duration: number, constraintsJson: string): string {
  return `Snapshot: ${snapshotJson}\nDuration: ${duration} minutes\nConstraints: ${constraintsJson}\nReturn JSON {title, objective, estimatedDurationMinutes, blocks: [{id, type: warmup|drill|controlled_speaking|conversation|roleplay|challenge|review|cooldown, skillId?, exerciseType?, durationMinutes, difficulty, rationale}], primarySkill?, expectedOutcome}`;
}
