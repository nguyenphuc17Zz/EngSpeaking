// Function 4 — Response Latency Training AI Prompts
// Spoken speed gym & 4-Quadrant Latency Evaluation

import {
  buildCreativeAngleDirective,
  formatAntiRepetitionList,
} from "./diversity-engine";

export const LATENCY_GENERATOR_SYSTEM = `You are the Spoken Response Latency Task Architect.
Goal: Train adult learners to start speaking in English rapidly (<2.5s) in vivid, non-cliché real-world situations.
Strictly avoid generic textbook questions ("What is your hobby?", "What do you do after work?").

RULES:
1. sampleResponses: 2 FULL, natural conversational English sentences (>=6 words, no prefixes).
2. bufferChunks: 3 short conversational buffer phrases for: "buying_time", "framing_opinion", "immediate_reaction" (with Vietnamese meaning).
3. suggestedVocabulary: 2 high-frequency phrases with Vietnamese meaning.
4. Do NOT output "hints" array — the server synthesizes 5-tier hints automatically.
5. STRICT JSON ONLY, NO MARKDOWN:
{
  "id": "lat_1",
  "drillMode": "open_response" | "rapid_retrieval" | "timed_countdown" | "baseline_test",
  "promptText": string,
  "promptLanguage": "en" | "vi",
  "targetIntent": string,
  "expectedKeywords": string[],
  "sampleResponses": [string, string],
  "targetLatencyMs": number,
  "staircaseTargetMs": number,
  "difficulty": number,
  "category": "daily_conversation" | "workplace" | "opinions" | "past_events" | "reactions" | "buffer_phrases",
  "bufferPhraseSuggestion": string,
  "bufferChunks": [{ "phrase": string, "meaningVi": string, "category": "buying_time" | "framing_opinion" | "immediate_reaction" }],
  "isBaseline": boolean,
  "suggestedVocabulary": [{ "term": string, "meaningVi": string }]
}`;

export function buildLatencyTaskUserPrompt(params: {
  drillMode: "open_response" | "rapid_retrieval" | "timed_countdown" | "baseline_test";
  category?: string;
  topic?: string;
  targetDifficulty: number;
  targetLatencyMs: number;
  recentPrompts?: string[];
}): string {
  const creativeAngle = buildCreativeAngleDirective();
  const filter = formatAntiRepetitionList(params.recentPrompts, 10);
  const topicInstruction = params.topic
    ? `\nTOPIC CONTEXT: "${params.topic}" — tailor the question, buffer phrases, vocabulary, and sample responses directly to this scenario.`
    : "";
  return `Generate 1 Response Latency task:
- Mode: "${params.drillMode}" | Category: "${params.category || "daily_conversation"}"
- Difficulty: ${params.targetDifficulty}/10 | Target Latency: ${params.targetLatencyMs}ms${topicInstruction}
- ${creativeAngle}${filter}
Output JSON only.`;
}

export const LATENCY_EVALUATOR_SYSTEM = `You are the Expert Spoken Response Latency Evaluator.
Evaluate the learner's spoken transcript for semantic accuracy, naturalness, and fluency given their measured latency.
Output STRICT JSON ONLY (server hydrates timing, quadrant, and hesitation fields):
{
  "overallScore": number (0-100),
  "accuracyScore": number (0-100),
  "naturalnessScore": number (0-100),
  "fluencyScore": number (0-100),
  "likelyCause": "automatic" | "spoken_retrieval" | "grammar_calculation" | "vocabulary_search" | "hesitation",
  "isSuccessful": boolean,
  "coachFeedbackVi": string,
  "betterResponse": string,
  "praisePoints": string[]
}`;

export function buildLatencyEvaluatorUserPrompt(params: {
  taskJson: string;
  userTranscript: string;
  responseLatencyMs: number;
  speechDurationMs: number;
  targetLatencyMs: number;
}): string {
  return `TASK: ${params.taskJson}
SPOKEN: "${params.userTranscript}"
METRICS: latency=${params.responseLatencyMs}ms (target=${params.targetLatencyMs}ms), duration=${params.speechDurationMs}ms
Return strict JSON.`;
}

