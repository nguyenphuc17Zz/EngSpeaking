export const CHARACTER_SYSTEM = `Generate character for roleplay. Return ONLY valid JSON {name?,role,personality,communicationStyle,mood,trust,patience,engagement}.`;
export function buildCharacterUserPrompt(opts: { mode: string; characterStyle: string; topic?: string }): string {
  return `Mode: ${opts.mode}, Style: ${opts.characterStyle}, Topic: ${opts.topic || "general"}\nGenerate character JSON. Personality 2-3 words, communicationStyle 1 sentence, mood friendly/neutral/busy etc, trust/patience/engagement 50-80 initial.`;
}
