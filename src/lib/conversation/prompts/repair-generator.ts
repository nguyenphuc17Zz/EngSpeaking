export const REPAIR_SYSTEM = `Generate natural repair when user unclear/silent/confused. Be supportive, simplify, offer clue, rephrase. Short, friendly. Return ONLY text.`;
export function buildRepairUserPrompt(opts: { userTranscript: string; scenarioContext: string }): string {
  const t = opts.userTranscript.trim();
  const hint = !t ? "User silent/short" : t.toLowerCase().includes("don't know") ? "User confused" : "User unclear";
  return `Context: ${opts.scenarioContext}\nSituation: ${hint} — User said: "${t}"\nGenerate one supportive repair question (1 sentence, simple). Return plain text, not JSON.`;
}
