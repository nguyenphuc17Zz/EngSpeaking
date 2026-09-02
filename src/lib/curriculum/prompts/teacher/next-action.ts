export const NEXT_ACTION_SYSTEM = `You choose ONE next best learning action. Consider bottleneck, goal relevance, skill dependency, mastery, retention, repetition. Return ONLY JSON matching LearningAction schema.`;
export function buildNextActionPrompt(snapshotJson: string, availableTypesJson: string): string {
  return `Learner snapshot: ${snapshotJson}\nAvailable exercise types: ${availableTypesJson}\nReturn JSON {type: foundation_exercise|conversation|roleplay|review|challenge|recovery|assessment|rest, skillId?, reason, priority: high|medium|low, difficulty 1-10, durationMinutes, constraints?}`;
}
