// Mock learner profiles §119 — synthetic

import type { LearnerState } from "@/types/learner";
import { createDefaultLearnerState } from "../learner-state-service";

function clone(state: LearnerState): LearnerState { return JSON.parse(JSON.stringify(state)); }

function withMastery(state: LearnerState, overrides: Record<string, number>): LearnerState {
  const next = clone(state);
  for (const [skill, mastery] of Object.entries(overrides)) {
    const s = next.skills.find((x) => x.skillId === skill);
    if (s) s.mastery = mastery;
  }
  return next;
}

const base = createDefaultLearnerState();

export const CURRICULUM_MOCK_PROFILES: Record<string, { label: string; state: LearnerState }> = {
  A: { label: "Profile A — Very strong grammar, very weak automaticity", state: withMastery(base, { grammar_in_speech: 0.85, sentence_retrieval: 0.3, response_speed: 0.25, automaticity: 0.2 }) },
  B: { label: "Profile B — Good fluency, weak grammar", state: withMastery(base, { fluency: 0.75, grammar_in_speech: 0.35, sentence_construction: 0.4 }) },
  C: { label: "Profile C — Strong vocab, weak active retrieval", state: withMastery(base, { active_vocabulary: 0.3, chunk_retrieval: 0.35, vocabulary: 0.8 } as unknown as Record<string, number>) },
  D: { label: "Profile D — Fast but inaccurate", state: withMastery(base, { response_speed: 0.85, fluency: 0.8, grammar_in_speech: 0.3, accuracy: 0.3 } as unknown as Record<string, number>) },
  E: { label: "Profile E — Accurate but hesitant", state: withMastery(base, { grammar_in_speech: 0.8, response_speed: 0.3, confidence: 0.35 }) },
  F: { label: "Profile F — Strong controlled, weak spontaneous", state: withMastery(base, { controlled_speaking: 0.85, free_conversation: 0.25, topic_switching: 0.2 }) },
  G: { label: "Profile G — Strong overall", state: withMastery(base, { sentence_retrieval: 0.8, fluency: 0.85, grammar_in_speech: 0.8, response_speed: 0.75 }) },
  H: { label: "Profile H — Long inactivity, retention risk", state: (() => {
    const s = withMastery(base, { sentence_retrieval: 0.75 });
    const target = s.skills.find((x) => x.skillId === "sentence_retrieval");
    if (target) { target.lastPracticedAt = new Date(Date.now() - 20 * 86400000).toISOString(); target.retentionRisk = 0.8; }
    return s;
  })() },
};
