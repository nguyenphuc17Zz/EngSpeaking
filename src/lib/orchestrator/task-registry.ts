// Task registry §5 — central, extensible
export type AITask =
  | "conversation_response"
  | "scenario_generation"
  | "character_generation"
  | "event_generation"
  | "followup_generation"
  | "conversation_summary"
  | "exercise_generation"
  | "exercise_evaluation"
  | "grammar_analysis"
  | "vocabulary_analysis"
  | "naturalness_analysis"
  | "fluency_analysis"
  | "communication_analysis"
  | "pronunciation_analysis"
  | "feedback_generation"
  | "hint_generation"
  | "speech_to_text"
  | "text_to_speech"
  | "general";

export interface AITaskRequirements {
  task: AITask;
  requiredCapabilities: string[];
  qualityLevel: "basic" | "standard" | "high" | "critical";
  latencyLevel: "low" | "medium" | "high";
  contextSize: "small" | "medium" | "large";
  structuredOutput?: boolean;
  audioInput?: boolean;
  audioOutput?: boolean;
  deterministicPreferred?: boolean;
}

export const TASK_REQUIREMENTS: Record<AITask, AITaskRequirements> = {
  conversation_response: { task: "conversation_response", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "low", contextSize: "medium", structuredOutput: false },
  scenario_generation: { task: "scenario_generation", requiredCapabilities: ["textGeneration", "structuredOutput"], qualityLevel: "high", latencyLevel: "medium", contextSize: "small", structuredOutput: true },
  character_generation: { task: "character_generation", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "small" },
  event_generation: { task: "event_generation", requiredCapabilities: ["textGeneration", "structuredOutput"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "medium", structuredOutput: true },
  followup_generation: { task: "followup_generation", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "low", contextSize: "medium" },
  conversation_summary: { task: "conversation_summary", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "large" },
  exercise_generation: { task: "exercise_generation", requiredCapabilities: ["textGeneration", "structuredOutput"], qualityLevel: "high", latencyLevel: "medium", contextSize: "medium", structuredOutput: true },
  exercise_evaluation: { task: "exercise_evaluation", requiredCapabilities: ["textGeneration", "structuredOutput"], qualityLevel: "high", latencyLevel: "medium", contextSize: "medium", structuredOutput: true },
  grammar_analysis: { task: "grammar_analysis", requiredCapabilities: ["textGeneration", "structuredOutput"], qualityLevel: "high", latencyLevel: "medium", contextSize: "medium", structuredOutput: true },
  vocabulary_analysis: { task: "vocabulary_analysis", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "medium" },
  naturalness_analysis: { task: "naturalness_analysis", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "medium" },
  fluency_analysis: { task: "fluency_analysis", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "medium" },
  communication_analysis: { task: "communication_analysis", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "medium" },
  pronunciation_analysis: { task: "pronunciation_analysis", requiredCapabilities: ["textGeneration"], qualityLevel: "high", latencyLevel: "medium", contextSize: "small" },
  feedback_generation: { task: "feedback_generation", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "low", contextSize: "small" },
  hint_generation: { task: "hint_generation", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "low", contextSize: "small" },
  speech_to_text: { task: "speech_to_text", requiredCapabilities: ["speechToText"], qualityLevel: "high", latencyLevel: "low", contextSize: "small", audioInput: true },
  text_to_speech: { task: "text_to_speech", requiredCapabilities: ["textToSpeech"], qualityLevel: "standard", latencyLevel: "low", contextSize: "small", audioOutput: true },
  general: { task: "general", requiredCapabilities: ["textGeneration"], qualityLevel: "standard", latencyLevel: "medium", contextSize: "medium" },
};

export function getTaskRequirements(task: AITask): AITaskRequirements {
  return TASK_REQUIREMENTS[task] || TASK_REQUIREMENTS.general;
}
