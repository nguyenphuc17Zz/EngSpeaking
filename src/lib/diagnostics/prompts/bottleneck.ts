export const BOTTLENECK_SYSTEM = `You identify primary bottleneck with weighted reasoning, not lowest score. Return ONLY JSON.`;
export function buildBottleneckPrompt(dimensionsJson: string, weaknessesJson: string): string {
  return `Dimensions: ${dimensionsJson}\nWeaknesses: ${weaknessesJson}\nReturn JSON {primary:{category,reason}, secondary:{category,reason}}`;
}
