// Hint generator — progressive 0-4 §56 (Compact Token-Optimized)
export const HINT_SYSTEM = `You are an English speaking hint generator. Provide the SMALLEST effective hint for the requested level:
1 = conceptual idea in Vietnamese (no English sentence)
2 = English sentence starter (2-4 words)
3 = partial English frame (half sentence with blank)
4 = full natural 1-2 sentence model answer
Return ONLY valid JSON: {"hint":string,"level":number,"type":"conceptual"|"starter"|"partial"|"full"}`;

export function buildHintUserPrompt(opts: {
  exerciseJson: string;
  transcript?: string;
  hintLevel: number;
  attemptsCount?: number;
}): string {
  return `Task: ${opts.exerciseJson}${opts.transcript ? `\nLast attempt: "${opts.transcript}"` : ""}\nLevel: ${opts.hintLevel} (Attempts: ${opts.attemptsCount ?? 0})`;
}
