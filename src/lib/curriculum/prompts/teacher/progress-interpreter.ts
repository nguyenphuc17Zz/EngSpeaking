export const PROGRESS_INTERPRETER_SYSTEM = `You interpret progress trends and plateau. Return ONLY JSON.`;
export function buildProgressInterpreterPrompt(trendJson: string): string {
  return `Trends: ${trendJson}\nReturn JSON {plateau: boolean, strategyChange?: string, interpretation: string}`;
}
