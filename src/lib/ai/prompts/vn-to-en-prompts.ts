// Prompts for Function 2 — Vietnamese -> English Spoken Retrieval Engine
// Converts Vietnamese thoughts directly into spoken English with Combinatorial Diversity & Compact Schema

import {
  buildCreativeAngleDirective,
  formatAntiRepetitionList,
} from "./diversity-engine";

export const VN_TO_EN_GENERATOR_SYSTEM = `You are the Spoken Retrieval Task Generator for an AI English Speaking Coach.
The learner has strong receptive English but trains instantaneous oral retrieval from natural Vietnamese thoughts.

RULES:
1. AUTHENTIC VIETNAMESE PROMPT: Natural spoken Vietnamese grounded in the given Topic and Creative Angle (Partner, Speech Act, Tone, Frame). Avoid robotic translationese or textbook clichés.
2. RETRIEVAL MODES:
   - "direct": Natural conversational sentence (Level 1-8).
   - "timed": Medium-complexity sentence under 2-3s countdown pressure.
   - "rapid_fire": Short, high-frequency conversational phrase (<2s reaction).
   - "native_idiomatic": Demands everyday native phrasal verbs or spoken idioms instead of literal translation.
3. SAY IT BETTER TRIO: Provide 3 concise spoken formulations ("professional", "casual", "idiomatic").
4. OUTPUT STRICT RAW JSON ONLY (no markdown fences):
{
  "id": "vn_1",
  "category": "daily_life" | "workplace" | "study" | "opinion" | "experience" | "plans" | "conditional" | "comparison" | "explanation" | "situational_intent",
  "retrievalMode": "direct" | "timed" | "rapid_fire",
  "promptVi": string,
  "targetIntent": string (primary full spoken English sentence),
  "expectedResponses": string[] (3 complete natural spoken English sentences),
  "requiredMeaningElements": string[] (2-3 core semantic chunks),
  "grammarCueVi": string (concise 1-line Vietnamese structure/tense cue),
  "starter": string (first 2-4 opening English words),
  "targetSkills": string[],
  "difficulty": { "overall": number, "grammarComplexity": number, "retrievalDemand": number, "semanticDensity": number },
  "suggestedVocabulary": [{ "term": string, "meaningVi": string, "partOfSpeech": "phrase" }],
  "sayItBetter": { "professional": string, "casual": string, "idiomatic": string },
  "prepTimeSec": number,
  "isRapidFire": boolean,
  "topic": string
}`;

export function buildVNToENTaskPrompt(params: {
  retrievalMode: "endless" | "direct" | "timed" | "rapid_fire" | "native_idiomatic";
  category?: string;
  targetDifficulty: number;
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  topic?: string;
  pedagogicalConstraint?: string;
}): string {
  const modeNote =
    params.retrievalMode === "native_idiomatic"
      ? "Require authentic native phrasal verbs or colloquial idioms instead of literal word-for-word translation."
      : params.retrievalMode === "rapid_fire"
      ? "Short, punchy high-frequency spoken response (<2s reaction)."
      : params.retrievalMode === "timed"
      ? "Direct oral retrieval under 2-3s preparation pressure."
      : "Fluid real-time conversational spoken retrieval.";

  const lines: string[] = [
    `Generate 1 VN->EN Speaking Task (JSON only):`,
    `- Mode: ${params.retrievalMode} (${modeNote}) | Category: ${params.category || "auto"} | Diff: ${params.targetDifficulty}/10`,
    `- Topic Situation: ${params.topic || "work_and_life"}`,
    `- ${buildCreativeAngleDirective()}`,
  ];

  if (params.weakSkills?.length) {
    lines.push(`- Target Skills: ${params.weakSkills.slice(0, 3).join(", ")}`);
  }
  if (params.recentErrors?.length) {
    lines.push(`- Subtly test recurring errors: ${params.recentErrors.slice(0, 4).join(", ")}`);
  }
  const antiRep = formatAntiRepetitionList(params.recentPrompts, 8);
  if (antiRep) {
    lines.push(`- ${antiRep}`);
  }
  if (params.pedagogicalConstraint) {
    lines.push(params.pedagogicalConstraint);
  }

  return lines.join("\n");
}

export const VN_TO_EN_EVALUATOR_SYSTEM = `You are the Expert Semantic Evaluator for Vietnamese -> English Spoken Retrieval.
Principles:
1. SEMANTIC MATCHING OVER LITERAL TRANSLATION: Accept all natural synonyms, paraphrases, and extra relevant details.
2. Scores (0-100): meaningScore (35%), grammarScore (25%), naturalnessScore (20%), fluencyScore, retrievalScore (20%), overallScore.
3. GAP DIAGNOSIS: "retrieval_gap" (delayed >3.5s despite knowing form), "knowledge_gap" (missing vocab/grammar), "production_gap" (clumsy assembly), or "none".
4. Feedback in warm, concise Vietnamese. Max 2 errors.
5. Output STRICT JSON only (no markdown):
{
  "overallScore": number,
  "meaningScore": number,
  "grammarScore": number,
  "naturalnessScore": number,
  "fluencyScore": number,
  "retrievalScore": number,
  "isCommunicativelyValid": boolean,
  "isSuccessful": boolean,
  "needsRetry": boolean,
  "isSayItBetterNeeded": boolean,
  "gapType": "none" | "knowledge_gap" | "retrieval_gap" | "production_gap",
  "gapExplanation": string,
  "errors": [{ "type": "grammar"|"vocabulary"|"article"|"preposition"|"word_order"|"omission", "severity": "minor"|"major", "userText": string, "correction": string, "explanation": string, "patternKey": string }],
  "betterVersion": string,
  "naturalAlternatives": [{ "expression": string, "tone": "neutral"|"casual"|"formal"|"idiomatic", "explanationVi": string }],
  "praisePoints": string[],
  "actionableFeedback": string
}`;

export function buildVNToENEvaluatorPrompt(params: {
  taskJson: string;
  userTranscript: string;
  responseLatencyMs: number;
  speechDurationMs: number;
  hintTierUsed: number;
  attemptNumber: number;
}): string {
  return `Task: ${params.taskJson}
Spoken: "${params.userTranscript}"
Metrics: latency=${params.responseLatencyMs}ms, duration=${params.speechDurationMs}ms, hintTier=${params.hintTierUsed}, attempt=${params.attemptNumber}
Evaluate semantic coverage, gapType, and naturalAlternatives. Return strict JSON.`;
}
