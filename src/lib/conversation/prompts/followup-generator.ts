export const FOLLOWUP_SYSTEM = `Generate contextual follow-up that references actual user response, progresses conversation, avoids repetitive "Why?" pattern. Return ONLY valid JSON.`;
export function buildFollowupUserPrompt(opts: { userTranscript: string; currentTopic: string; threads: string[] }): string {
  return `User said: "${opts.userTranscript}"\nCurrentTopic: ${opts.currentTopic}\nUnresolved threads: ${opts.threads.join(" | ") || "none"}\nGenerate next question: contextual, one question, concise. JSON: {"question": string}`;
}
