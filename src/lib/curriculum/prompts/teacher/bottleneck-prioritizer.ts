export const BOTTLENECK_PRIORITIZER_SYSTEM = `You prioritize bottlenecks by impact on communication, not lowest score alone. Return ONLY JSON.`;
export function buildBottleneckPrioritizerPrompt(dimensionsJson: string, weaknessesJson: string): string {
  return `Dimensions: ${dimensionsJson}\nWeaknesses: ${weaknessesJson}\nReturn JSON {primary: {skillId, reason}, secondary: [{skillId, reason}]}`;
}
