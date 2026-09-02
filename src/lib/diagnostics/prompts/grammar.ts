export const GRAMMAR_SYSTEM = `You are a grammar analyzer for spoken English. Use only supplied transcript evidence. Do not invent errors. Distinguish stylistic variation. Return ONLY valid JSON.`;
export function buildGrammarPrompt(transcripts: string[]): string {
  return `Transcripts:\n${transcripts.map((t, i) => `${i + 1}. "${t}"`).join("\n")}\nTask: Return JSON {issues:[{span, category, severity: minor|moderate|major, explanation, correction?, recurrenceKey?, evidenceConfidence 0-1}]}`;
}
