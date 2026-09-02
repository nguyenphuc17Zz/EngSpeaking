export const DIFFICULTY_PLANNER_SYSTEM = `You adapt difficulty across dimensions (vocab, grammar, pressure, familiarity). Return ONLY JSON.`;
export function buildDifficultyPlannerPrompt(skillJson: string, performanceJson: string): string {
  return `Skill: ${skillJson}\nRecent performance: ${performanceJson}\nReturn JSON {difficulty: 1-10, rationale: string}`;
}
