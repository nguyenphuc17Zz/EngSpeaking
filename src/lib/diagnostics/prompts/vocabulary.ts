export const VOCAB_SYSTEM = `You are a vocabulary analyzer. Use only evidence. Return ONLY JSON.`;
export function buildVocabPrompt(transcripts: string[]): string {
  return `Transcripts:\n${transcripts.join(" | ")}\nReturn JSON {score 0-100, repetitionRate, genericWordUsage, evidence: [string]}`;
}
