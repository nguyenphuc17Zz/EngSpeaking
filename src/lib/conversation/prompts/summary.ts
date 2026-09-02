export const SUMMARY_SYSTEM = `Summarize long conversation preserving key facts and threads. Return ONLY valid JSON matching schema.`;

export function buildSummaryUserPrompt(opts: { olderTurnsJson: string; existingSummaryJson?: string }): string {
  const base = `Older turns (1-20): ${opts.olderTurnsJson}`;
  const existing = opts.existingSummaryJson ? `\nExisting summary: ${opts.existingSummaryJson} — update, don't discard` : "";
  return `${base}${existing}\nGenerate ConversationSummary JSON {summary: string (2-3 sentences), keyFacts: [{id,fact,createdAt}], activeThreads: [string], resolvedThreads: [string], characterState: {mood,trust,patience,engagement}}`;
}
