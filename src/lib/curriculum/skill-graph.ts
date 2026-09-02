// Skill dependency graph §8 — data-driven, extensible
export const SKILL_DEPENDENCIES: Record<string, string[]> = {
  sentence_construction: ["sentence_retrieval"],
  sentence_expansion: ["sentence_construction"],
  controlled_speaking: ["sentence_expansion", "substitution"],
  timed_speaking: ["controlled_speaking"],
  rapid_response: ["timed_speaking", "sentence_retrieval"],
  conversation: ["rapid_response", "controlled_speaking"],
  free_conversation: ["conversation"],
  topic_switching: ["free_conversation"],
  recovery: ["confidence"],
  conversation_resilience: ["recovery"],
  // foundation
  substitution: ["sentence_retrieval"],
  active_vocabulary: ["chunk_retrieval"],
  grammar_in_speech: ["sentence_construction"],
  micro_monologue: ["timed_speaking"],
};

export function getPrerequisites(skillId: string): string[] {
  return SKILL_DEPENDENCIES[skillId] || [];
}

export function arePrerequisitesSatisfied(skillId: string, masteryMap: Map<string, number>, threshold = 0.5): boolean {
  const prereqs = getPrerequisites(skillId);
  if (prereqs.length === 0) return true;
  return prereqs.every((p) => (masteryMap.get(p) || 0) >= threshold);
}

export function topologicalSort(skillIds: string[]): string[] {
  // Simple sort by dependency depth
  const depth = new Map<string, number>();
  const visit = (id: string, visiting = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const prereqs = getPrerequisites(id);
    const d = prereqs.length === 0 ? 0 : Math.max(...prereqs.map((p) => visit(p, visiting))) + 1;
    depth.set(id, d);
    return d;
  };
  for (const id of skillIds) visit(id);
  return [...skillIds].sort((a, b) => (depth.get(a) || 0) - (depth.get(b) || 0));
}
