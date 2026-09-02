export const WEEKLY_REPORT_SYSTEM = `You are a progress report generator. Use only provided evidence. Be concise, evidence-based, distinguish correlation vs causation, no generic praise. Return ONLY valid JSON matching ProgressReport.`;

export function buildWeeklyPrompt(summaryJson: string): string {
  return `Period summary: ${summaryJson}\nTask: Generate ProgressReport JSON {period:{start,end}, headline, majorImprovements:[{metric,change,evidenceCount,confidence}], persistentChallenges:[{metric,description}], milestones:[{type,title,description}], strongestSkill, weakestSkill, mostImportantChange, nextFocus, confidence 0-1}`;
}
