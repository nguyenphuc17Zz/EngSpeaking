import type { Recommendation, Bottleneck } from "@/types/diagnostics";

const SKILL_MAP: Record<string, { skill: string; exercises: string[]; metric?: string }> = {
  responseSpeed: { skill: "response_speed", exercises: ["rapid_response", "timed_speaking"], metric: "responseSpeed" },
  fluency: { skill: "fluency", exercises: ["shadowing", "timed_speaking", "micro_monologue"], metric: "fluency" },
  grammar: { skill: "grammar_in_speech", exercises: ["sentence_pattern", "grammar_speaking"], metric: "grammar" },
  vocabulary: { skill: "active_vocabulary", exercises: ["vocabulary_activation", "chunk_practice"], metric: "vocabulary" },
  naturalness: { skill: "sentence_expansion", exercises: ["answer_expansion", "controlled_speaking"], metric: "naturalness" },
  communication: { skill: "controlled_speaking", exercises: ["controlled_speaking", "follow_up"], metric: "communication" },
  confidence: { skill: "confidence", exercises: ["confidence", "recovery"], metric: "confidence" },
  pronunciation: { skill: "shadowing", exercises: ["shadow", "pronunciation_micro"], metric: "pronunciation" },
};

export function buildRecommendations(bottlenecks: Bottleneck[], patterns: Array<{ patternKey: string }>): Recommendation[] {
  const recs: Recommendation[] = [];
  for (let i = 0; i < bottlenecks.length; i++) {
    const bn = bottlenecks[i];
    const mapped = SKILL_MAP[bn.category] || { skill: bn.category, exercises: ["free_conversation"], metric: bn.category };
    recs.push({
      skill: mapped.skill,
      priority: i === 0 ? "high" : "medium",
      reason: bn.reason,
      evidenceIds: [],
      suggestedExerciseTypes: mapped.exercises,
      targetMetric: mapped.metric,
    });
  }
  // Pattern-based secondary
  if (patterns.some((p) => p.patternKey === "short_answer_speaker") && !recs.some((r) => r.skill === "controlled_speaking")) {
    recs.push({
      skill: "answer_expansion",
      priority: recs.length === 0 ? "high" : "low",
      reason: "Short answers — need elaboration training",
      evidenceIds: [],
      suggestedExerciseTypes: ["answer_expansion", "follow_up"],
      targetMetric: "communication",
    });
  }
  return recs.slice(0, 3);
}
