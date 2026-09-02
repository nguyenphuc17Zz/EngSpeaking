export const LEARNER_STATE_ANALYZER_SYSTEM = `You analyze learner state compact snapshot and identify focus. Be concise, evidence-based. Return ONLY JSON.`;
export function buildLearnerStateAnalyzerPrompt(snapshotJson: string): string {
  return `Snapshot: ${snapshotJson}\nTask: Return JSON {primaryBottleneck: string, secondaryBottlenecks: [string], topStrengths: [string], reviewCandidates: [string], reasoning: string}`;
}
