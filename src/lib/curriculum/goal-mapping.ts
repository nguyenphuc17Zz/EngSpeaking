// Goal → skill mapping §16 — baseline + AI reasoning
export const GOAL_SKILL_MAP: Record<string, string[]> = {
  general: ["sentence_retrieval", "response_speed", "fluency"],
  daily_conversation: ["sentence_retrieval", "chunk_retrieval", "conversation_followup"],
  workplace: ["explaining", "clarification", "professional_communication", "response_speed"],
  interview: ["clarification", "storytelling", "opinion_expression", "recovery"],
  travel: ["sentence_retrieval", "recovery", "social_conversation"],
  presentation: ["micro_monologue", "explaining", "confidence"],
  professional: ["negotiation", "persuasion", "professional_communication", "clarification"],
  fluency: ["fluency", "response_speed", "automaticity"],
  naturalness: ["naturalness", "sentence_expansion", "chunk_retrieval"],
  pronunciation: ["pronunciation", "shadowing"],
  confidence: ["confidence", "recovery", "self_correction"],
  ai_decide: [],
};

export function getSkillsForGoal(goalId: string): string[] {
  return GOAL_SKILL_MAP[goalId] || GOAL_SKILL_MAP.general;
}

export function reconcileGoalAndDiagnosis(
  userGoal: string,
  bottleneckSkill: string
): { primarySkill: string; reason: string } {
  // User goal absolute (§17) — teacher respects user, but explains diagnosis
  const goalSkills = getSkillsForGoal(userGoal);
  // If bottleneck is already in goal skills, use it
  if (goalSkills.includes(bottleneckSkill)) {
    return { primarySkill: bottleneckSkill, reason: `Mục tiêu của bạn (${userGoal}) và chẩn đoán bottleneck (${bottleneckSkill}) trùng khớp — tập trung vào ${bottleneckSkill}` };
  }
  // Otherwise, prioritize user goal but note bottleneck as secondary
  const primary = goalSkills[0] || bottleneckSkill;
  return { primarySkill: primary, reason: `Tôn trọng mục tiêu của bạn: ${userGoal} → ưu tiên ${primary}. Bottleneck AI phát hiện (${bottleneckSkill}) sẽ là mục tiêu phụ.` };
}
