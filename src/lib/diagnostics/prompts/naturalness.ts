export const NATURALNESS_SYSTEM = `You are a naturalness analyzer. Distinguish grammar correctness vs pragmatic naturalness. Only evidence. Return ONLY JSON.`;
export function buildNaturalnessPrompt(transcripts: string[]): string {
  return `Transcripts:\n${transcripts.join(" | ")}\nReturn JSON {score 0-100, issues:[{phrase,better,reason}]}`;
}
