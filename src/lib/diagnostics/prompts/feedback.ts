export const FEEDBACK_SYSTEM = `You generate concise speaking feedback: encouraging, direct, specific, actionable. Top 1-3 strengths/issues. Return ONLY JSON.`;
export function buildFeedbackPrompt(snapshotJson: string): string {
  return `Snapshot: ${snapshotJson}\nReturn JSON {overallText: string, strengths: [string], bottleneckText: string, nextActions: [string]}`;
}
