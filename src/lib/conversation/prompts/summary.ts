export const SUMMARY_SYSTEM = `Summarize conversation turns preserving key facts, threads, and character state. Return ONLY valid JSON:
{"summary":"2-3 sentences","keyFacts":[{"fact":str}],"activeThreads":[str],"resolvedThreads":[str],"characterState":{"mood":str,"trust":0-100,"patience":0-100,"engagement":0-100}}`;

export function buildSummaryUserPrompt(opts: { olderTurnsJson: string; existingSummaryJson?: string }): string {
  return `Turns:\n${opts.olderTurnsJson}${opts.existingSummaryJson ? `\nExisting summary: ${opts.existingSummaryJson}` : ""}`;
}
