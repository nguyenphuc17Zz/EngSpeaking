// Prompts for Function 1 — Sentence Builder / Controlled Speaking
// Ultra-compact token-efficient prompts with Combinatorial Diversity & Zero-Anchor Bias

import {
  buildCreativeAngleDirective,
  formatAntiRepetitionList,
} from "./diversity-engine";

export const TASK_GENERATOR_SYSTEM = `Generate 1 English Speaking Sentence Builder task for adult Vietnamese learners.
Goal: Trigger fast, authentic spoken English retrieval in vivid real-world situations.

RULES:
1. Grounded Context & Angle: Strictly ground the sentence in the given Topic and Creative Angle (Partner, Speech Act, Tone, Frame). Avoid textbook clichés.
2. Control Levels:
   - "controlled": Template with 1-2 blanks ("___") + starter + 2-3 keywords.
   - "semi_controlled": 2-3 keywords + starter only, template=null.
   - "free": Situational cue only, template=null, keywords=[].
3. targetIntent: MUST be 1 COMPLETE natural spoken English sentence.
4. expectedResponses: 3 FULL natural spoken sentences (contracted & conversational variants). Never output isolated blank fragments.
5. Output STRICT JSON only (no markdown):
{
  "id": "sb_1",
  "taskType": "translation_output" | "sentence_completion" | "sentence_expansion" | "constraint_speaking",
  "controlLevel": "controlled" | "semi_controlled" | "free",
  "instruction": string (Vietnamese),
  "promptVi": string (natural spoken Vietnamese thought to express),
  "targetIntent": string (COMPLETE English sentence),
  "expectedResponses": string[] (3 FULL English sentences),
  "requiredElements": string[] (2-3 core meaning chunks),
  "grammarCueVi": string (concise 1-line Vietnamese structure/tense tip),
  "scaffold": { "level": 1 | 2 | 3, "template": string | null, "keywords": string[], "starter": string | null, "constraints": string[] },
  "suggestedVocabulary": [{ "term": string, "meaningVi": string }],
  "topic": string,
  "difficulty": { "overall": number, "grammarComplexity": number, "retrievalDemand": number, "lengthScore": number },
  "skills": ["sentence_construction"],
  "prepTimeSec": 3.0
}`;

export function buildTaskGeneratorUserPrompt(params: {
  controlLevel: "controlled" | "semi_controlled" | "free";
  taskType?: string;
  targetDifficulty?: number;
  topic?: string;
  prepTimeSec?: number;
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  targetErrorPattern?: unknown;
  pedagogicalConstraint?: string;
}): string {
  const topicInstruction =
    params.topic && params.topic !== "random"
      ? params.topic
      : "Fresh everyday or professional spoken interaction";

  const lines: string[] = [
    `Generate 1 Sentence Builder Task (JSON only):`,
    `- Control: ${params.controlLevel} | Diff: ${params.targetDifficulty ?? 3}/10 | Type: ${params.taskType || "auto"}`,
    `- Topic: ${topicInstruction}`,
    `- ${buildCreativeAngleDirective()}`,
  ];

  if (params.weakSkills?.length) {
    lines.push(`- Target Weak Skills: ${params.weakSkills.slice(0, 3).join(", ")}`);
  }
  if (params.recentErrors?.length) {
    lines.push(`- Subtly test error patterns: ${params.recentErrors.slice(0, 4).join(", ")}`);
  }
  const antiRep = formatAntiRepetitionList(params.recentPrompts);
  if (antiRep) {
    lines.push(`- ${antiRep}`);
  }
  if (params.pedagogicalConstraint) {
    lines.push(params.pedagogicalConstraint);
  }

  return lines.join("\n");
}

export const EVALUATOR_SYSTEM = `You are the Expert Spoken English Evaluator.
Principles:
1. COMMUNICATIVE CORRECTNESS FIRST: Accept natural synonyms, contractions, and paraphrases that convey the core meaning. Do not penalize minor non-blocking slips.
2. Score 0-100: meaningScore (35%), grammarScore (25%), naturalnessScore (20%), fluencyScore, retrievalScore (20%), overallScore.
3. Max 2 high-impact errors. Feedback in encouraging, concise Vietnamese.
4. Output STRICT JSON only (no markdown):
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
  "errors": [{ "type": "grammar"|"vocabulary"|"naturalness"|"omission"|"word_order", "severity": "minor"|"major", "userText": string, "correction": string, "explanation": string, "patternKey": string }],
  "betterVersion": string,
  "simplifiedVersion": string | null,
  "praisePoints": string[],
  "actionableFeedback": string
}`;

export function buildEvaluatorUserPrompt(params: {
  taskJson: string;
  userTranscript: string;
  latencyMs: number;
  speechDurationMs: number;
  hintTierUsed: number;
  attemptNumber: number;
}): string {
  return `Task: ${params.taskJson}
Spoken: "${params.userTranscript}"
Metrics: latency=${params.latencyMs}ms, duration=${params.speechDurationMs}ms, hintTier=${params.hintTierUsed}, attempt=${params.attemptNumber}
Evaluate JSON only.`;
}
