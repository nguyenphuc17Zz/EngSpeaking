export const FLUENCY_SYSTEM = `You are a fluency analyzer. Use deterministic metrics plus transcript. Return ONLY JSON.`;
export function buildFluencyPrompt(metricsJson: string): string {
  return `Metrics: ${metricsJson}\nReturn JSON {score 0-100, pauseClassification: natural|thinking|hesitation|long, evidence: [string]}`;
}
