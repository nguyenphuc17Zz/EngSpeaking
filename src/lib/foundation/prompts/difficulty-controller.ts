// Difficulty controller — AI-assisted §42, single responsibility
export const DIFFICULTY_SYSTEM = `You decide next exercise difficulty 1-10 given last exercise and evaluation.

Return ONLY valid JSON: {"classification":"too_easy"|"appropriate"|"too_hard","nextDifficulty":1-10,"reason":string}`;

export function buildDifficultyPrompt(exerciseJson: string, evaluationJson: string): string {
  return `Last exercise: ${exerciseJson}\nEvaluation: ${evaluationJson}\nRules: too_easy→+1, appropriate→0, too_hard→-1, but consider hintLevel/timeToFirstWord. Keep within 1-10.`;
}
