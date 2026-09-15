// Function 4 — Response Latency Training AI Prompts
// Spoken speed gym & 4-Quadrant Latency Evaluation

export const LATENCY_GENERATOR_SYSTEM = `Generate 1 Spoken Response Latency training task.
Goal: Train adult learners to start speaking in English rapidly (<2.5s).

RULES:
1. sampleResponses: 1-2 FULL, natural conversational English sentences (>=5 words).
2. bufferChunks: 3 short conversational buffer phrases for: "buying_time", "framing_opinion", "immediate_reaction" (with Vietnamese meaning).
3. hints: 5 items (T0: none, T1: keywords, T2: buffer starter, T3: skeleton with '______', T4: full sample sentence without prefix).
4. suggestedVocabulary: 2 high-frequency phrases with Vietnamese meaning.
5. STRICT JSON ONLY, NO MARKDOWN:
{
  "id": "lat_1",
  "drillMode": "open_response" | "rapid_retrieval" | "timed_countdown" | "baseline_test",
  "promptText": string,
  "promptLanguage": "en" | "vi",
  "targetIntent": string,
  "expectedKeywords": string[],
  "sampleResponses": string[],
  "targetLatencyMs": number,
  "staircaseTargetMs": number,
  "difficulty": number,
  "category": "daily_conversation" | "workplace" | "opinions" | "past_events" | "reactions" | "buffer_phrases",
  "bufferPhraseSuggestion": string,
  "bufferChunks": [{ "phrase": string, "meaningVi": string, "category": "buying_time" | "framing_opinion" | "immediate_reaction" }],
  "isBaseline": boolean,
  "hints": [{ "tier": 0 | 1 | 2 | 3 | 4, "title": string, "content": string }],
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
  const filter = params.recentPrompts?.length ? ` Avoid repeating: ${params.recentPrompts.slice(-5).join(" | ")}.` : "";
  const topicInstruction = params.topic ? ` Topic context: "${params.topic}". Tailor the question/prompt, vocabulary, and sample response directly to this topic context.` : "";
  return `Generate task for mode="${params.drillMode}", category="${params.category || "daily_conversation"}", diff=${params.targetDifficulty}/10, targetMs=${params.targetLatencyMs}.${topicInstruction}${filter} Output JSON only.`;
}

export const LATENCY_EVALUATOR_SYSTEM = `You are the Expert Response Latency Evaluator for Spoken Retrieval.
You analyze user spoken audio transcript together with measured client-side latency.

4-QUADRANT LATENCY CLASSIFICATION:
1. "fast_correct": Latency <= Target Latency AND Accuracy >= 70% (Automatic retrieval mastery).
2. "slow_correct": Latency > Target Latency AND Accuracy >= 70% (Knowledge present, retrieval delayed - encourage speed without punishing grammar).
3. "fast_incorrect": Latency <= Target Latency AND Accuracy < 70% (Speed good, accuracy slips - focus on quality).
4. "slow_incorrect": Latency > Target Latency AND Accuracy < 70% (Cognitive overload - suggest scaffold).

HESITATION & FILLER ANALYSIS:
- Count filler words: "um", "uh", "like", "you know", "i mean".
- Detect mid-sentence self-corrections.

OUTPUT STRICT JSON ONLY:
{
  "overallScore": number (0-100),
  "accuracyScore": number (0-100),
  "naturalnessScore": number (0-100),
  "fluencyScore": number (0-100),
  "responseLatencyMs": number,
  "speechDurationMs": number,
  "targetLatencyMs": number,
  "latencyRatio": number,
  "quadrant": "fast_correct" | "slow_correct" | "fast_incorrect" | "slow_incorrect",
  "latencyStatus": "excellent" | "strong" | "moderate" | "slow" | "very_slow",
  "likelyCause": "automatic" | "spoken_retrieval" | "grammar_calculation" | "vocabulary_search" | "hesitation",
  "hesitation": {
    "fillerCount": number,
    "fillersDetected": string[],
    "fillersPerMinute": number,
    "pauseCount": number,
    "selfCorrectionDetected": boolean
  },
  "userTranscript": string,
  "cleanTranscript": string,
  "isSuccessful": boolean,
  "coachFeedbackVi": string (warm coaching feedback focusing on speed & confidence),
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
  return `Evaluate this spoken response latency attempt:
TASK:
${params.taskJson}

USER SPOKEN TRANSCRIPT:
"${params.userTranscript}"

MEASURED METRICS:
- Measured Learner Response Latency: ${params.responseLatencyMs} ms
- Target Latency: ${params.targetLatencyMs} ms
- Speech Duration: ${params.speechDurationMs} ms

Determine accuracy, quadrant classification, filler count, and return strict JSON.`;
}
