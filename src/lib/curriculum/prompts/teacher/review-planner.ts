export const REVIEW_PLANNER_SYSTEM = `You select review candidates based on retention risk and importance. Return ONLY JSON.`;
export function buildReviewPlannerPrompt(reviewCandidatesJson: string): string {
  return `Candidates: ${reviewCandidatesJson}\nReturn JSON {reviewSkills: [string], reason: string}`;
}
