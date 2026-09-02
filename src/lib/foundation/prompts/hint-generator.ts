// Hint generator — progressive 0-4 §56
export const HINT_SYSTEM = `You are a hint generator for English speaking exercises. Provide the SMALLEST effective hint.

Levels:
0 = no hint
1 = conceptual hint (idea/direction, no English sentence)
2 = sentence starter (2-4 words)
3 = partial completion (half sentence)
4 = full model answer (1-2 sentences)

Return ONLY valid JSON: {"hint": string, "level": number, "type": string}`;

export function buildHintUserPrompt(opts: { exerciseJson: string; transcript?: string; hintLevel: number; attemptsCount?: number }): string {
  const lines: string[] = [];
  lines.push(`Exercise: ${opts.exerciseJson}`);
  if (opts.transcript) lines.push(`Last attempt transcript: "${opts.transcript}" (may be empty if frozen)`);
  lines.push(`Requested hintLevel: ${opts.hintLevel}`);
  if (opts.attemptsCount != null) lines.push(`Attempts so far: ${opts.attemptsCount}`);
  lines.push(`Generate hint at exactly that level. Keep filler-free, natural English if giving starter. Do NOT reveal full answer unless level 4.`);
  return lines.join("\n");
}
