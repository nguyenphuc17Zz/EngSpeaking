import type { AITask } from "./task-registry";

export interface AITaskPolicy {
  task: AITask;
  preferredCapabilities: string[];
  qualityWeight: number;
  latencyWeight: number;
  costWeight: number;
  reliabilityWeight: number;
  contextStrategy: "full" | "recent" | "summary" | "relevant" | "compact" | "structured";
  maxRetries: number;
  cacheStrategy: "none" | "session" | "persistent";
  fallbackStrategy: "fail_fast" | "retry" | "deterministic_fallback" | "provider_fallback";
}

export const TASK_POLICIES: Record<AITask, AITaskPolicy> = {
  conversation_response: { task: "conversation_response", preferredCapabilities: ["textGeneration"], qualityWeight: 0.3, latencyWeight: 0.5, costWeight: 0.15, reliabilityWeight: 0.05, contextStrategy: "recent", maxRetries: 2, cacheStrategy: "none", fallbackStrategy: "retry" },
  scenario_generation: { task: "scenario_generation", preferredCapabilities: ["textGeneration", "structuredOutput"], qualityWeight: 0.5, latencyWeight: 0.2, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 2, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  character_generation: { task: "character_generation", preferredCapabilities: ["textGeneration"], qualityWeight: 0.4, latencyWeight: 0.3, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "session", fallbackStrategy: "deterministic_fallback" },
  event_generation: { task: "event_generation", preferredCapabilities: ["textGeneration"], qualityWeight: 0.35, latencyWeight: 0.35, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "recent", maxRetries: 1, cacheStrategy: "none", fallbackStrategy: "deterministic_fallback" },
  followup_generation: { task: "followup_generation", preferredCapabilities: ["textGeneration"], qualityWeight: 0.3, latencyWeight: 0.5, costWeight: 0.15, reliabilityWeight: 0.05, contextStrategy: "recent", maxRetries: 1, cacheStrategy: "none", fallbackStrategy: "retry" },
  conversation_summary: { task: "conversation_summary", preferredCapabilities: ["textGeneration"], qualityWeight: 0.4, latencyWeight: 0.3, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "summary", maxRetries: 2, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  exercise_generation: { task: "exercise_generation", preferredCapabilities: ["textGeneration", "structuredOutput"], qualityWeight: 0.5, latencyWeight: 0.2, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 2, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  exercise_evaluation: { task: "exercise_evaluation", preferredCapabilities: ["textGeneration", "structuredOutput"], qualityWeight: 0.6, latencyWeight: 0.2, costWeight: 0.1, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 2, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  grammar_analysis: { task: "grammar_analysis", preferredCapabilities: ["textGeneration", "structuredOutput"], qualityWeight: 0.6, latencyWeight: 0.15, costWeight: 0.15, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 2, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  vocabulary_analysis: { task: "vocabulary_analysis", preferredCapabilities: ["textGeneration"], qualityWeight: 0.5, latencyWeight: 0.2, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  naturalness_analysis: { task: "naturalness_analysis", preferredCapabilities: ["textGeneration"], qualityWeight: 0.5, latencyWeight: 0.2, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  fluency_analysis: { task: "fluency_analysis", preferredCapabilities: ["textGeneration"], qualityWeight: 0.4, latencyWeight: 0.3, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  communication_analysis: { task: "communication_analysis", preferredCapabilities: ["textGeneration"], qualityWeight: 0.5, latencyWeight: 0.2, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  pronunciation_analysis: { task: "pronunciation_analysis", preferredCapabilities: ["textGeneration"], qualityWeight: 0.6, latencyWeight: 0.2, costWeight: 0.1, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "persistent", fallbackStrategy: "deterministic_fallback" },
  feedback_generation: { task: "feedback_generation", preferredCapabilities: ["textGeneration"], qualityWeight: 0.4, latencyWeight: 0.3, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "none", fallbackStrategy: "retry" },
  hint_generation: { task: "hint_generation", preferredCapabilities: ["textGeneration"], qualityWeight: 0.3, latencyWeight: 0.5, costWeight: 0.15, reliabilityWeight: 0.05, contextStrategy: "compact", maxRetries: 1, cacheStrategy: "none", fallbackStrategy: "deterministic_fallback" },
  speech_to_text: { task: "speech_to_text", preferredCapabilities: ["speechToText"], qualityWeight: 0.6, latencyWeight: 0.3, costWeight: 0.05, reliabilityWeight: 0.05, contextStrategy: "full", maxRetries: 2, cacheStrategy: "none", fallbackStrategy: "retry" },
  text_to_speech: { task: "text_to_speech", preferredCapabilities: ["textToSpeech"], qualityWeight: 0.4, latencyWeight: 0.5, costWeight: 0.05, reliabilityWeight: 0.05, contextStrategy: "full", maxRetries: 2, cacheStrategy: "session", fallbackStrategy: "retry" },
  general: { task: "general", preferredCapabilities: ["textGeneration"], qualityWeight: 0.4, latencyWeight: 0.3, costWeight: 0.2, reliabilityWeight: 0.1, contextStrategy: "compact", maxRetries: 2, cacheStrategy: "none", fallbackStrategy: "retry" },
};

export function getTaskPolicy(task: AITask): AITaskPolicy {
  return TASK_POLICIES[task] || TASK_POLICIES.general;
}
