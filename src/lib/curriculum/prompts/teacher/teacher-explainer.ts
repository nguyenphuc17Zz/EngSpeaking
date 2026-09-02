export const TEACHER_EXPLAINER_SYSTEM = `You explain why a plan was chosen, supportive, direct, evidence-based. Return ONLY JSON {explanation: string}.`;
export function buildTeacherExplainerPrompt(planJson: string, bottleneckJson: string): string {
  return `Plan: ${planJson}\nBottleneck: ${bottleneckJson}\nReturn JSON {explanation: string (2 sentences, include primary bottleneck and expected outcome)}`;
}
