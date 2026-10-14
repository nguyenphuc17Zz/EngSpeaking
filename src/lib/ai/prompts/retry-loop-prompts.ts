// Function 3 — Retry Loop: Correct -> Say Again AI Prompts
// Optimized for token efficiency, zero-anchor diversity, and deterministic 5-tier hint hydration

import {
  buildCreativeAngleDirective,
  formatAntiRepetitionList,
} from "./diversity-engine";

export const CORRECTION_GENERATOR_SYSTEM = `You are the Spoken Repair Correction Engine for an AI English Speaking Coach.
Extract the SINGLE highest-priority error from a spoken attempt and generate a minimal, actionable spoken repair prompt.

PRIORITY ORDER:
1: Meaning-breaking errors
2: Major grammar (tense, agreement, modals)
3: Missing essential meaning elements
4: Clumsy / unnatural phrasing
5: Minor grammar (articles, prepositions)

RULES:
- No long grammar lectures: 1 concise Vietnamese explanation sentence.
- Do NOT output "hints" array (the server synthesizes 5-tier hints from your fields).
- Output STRICT JSON ONLY (no markdown):
{
  "errorType": "grammar" | "vocabulary" | "article" | "preposition" | "word_order" | "omission" | "naturalness",
  "priority": 1 | 2 | 3 | 4 | 5,
  "patternKey": string,
  "whatToFix": string (short Vietnamese title),
  "userErroneousText": string (exact wrong fragment),
  "minimalCorrection": string (corrected fragment),
  "explanationVi": string (1 concise Vietnamese explanation),
  "betterSentence": string (full natural English sentence),
  "skeletonHint": string (sentence with "______" at the repaired spot),
  "simplifiedSentence": string (shorter 4-8 word version),
  "suggestedVocabulary": [{ "term": string, "meaningVi": string }]
}`;

export function buildCorrectionGeneratorUserPrompt(params: {
  prompt: string;
  userTranscript: string;
  expectedSentence: string;
  detectedErrors?: Array<{ type: string; userText: string; correction: string; explanation: string }>;
}): string {
  return `Target Intent: "${params.prompt}"
User Spoke: "${params.userTranscript}"
Model Sentence: "${params.expectedSentence}"
Detected Errors: ${JSON.stringify((params.detectedErrors || []).slice(0, 3))}
Select single highest-priority error and return strict JSON.`;
}

export const REPAIR_CHALLENGE_GENERATOR_SYSTEM = `You are the Expert Spoken Repair Challenge Generator.
Generate a realistic spoken English sentence containing a high-frequency error made by Vietnamese learners (e.g., tense omission, false friend collocation, wrong preposition, literal word-by-word translation, missing plural/3rd-person -s, awkward phrasing).
Ground the scenario in the requested Topic and Creative Angle. Do NOT output "hints" array (server synthesizes it).

OUTPUT STRICT JSON ONLY (no markdown):
{
  "id": "repair_1",
  "category": "grammar" | "vocabulary" | "collocation" | "preposition" | "tenses" | "naturalness",
  "situationVi": string (vivid real-world Vietnamese context),
  "targetIntent": string (Vietnamese instruction of what to express),
  "erroneousSentence": string (full sentence containing the typical mistake),
  "userErroneousText": string (the specific erroneous phrase),
  "whatToFix": string (concise Vietnamese error title),
  "explanationVi": string (1 concise Vietnamese rule/reason),
  "betterSentence": string (full natural corrected English sentence),
  "skeletonHint": string (sentence with "______" replacing the fixed phrase),
  "simplifiedSentence": string (shorter 5-8 word version),
  "conversationalTrap": {
    "partnerUtterance": string (natural partner follow-up questioning the error),
    "reactionPromptVi": string (Vietnamese cue to clarify/correct immediately),
    "suggestedStarter": string (e.g. "Oh sorry, I meant...")
  },
  "suggestedVocabulary": [{ "term": string, "meaningVi": string, "partOfSpeech": "phrase" }]
}`;

export function buildRepairChallengeUserPrompt(params: {
  category?: string;
  recentPatterns?: string[];
  topic?: string;
}): string {
  const lines: string[] = [
    `Generate 1 Spoken Repair Challenge (JSON only):`,
    `- Category: ${params.category || "any high-frequency spoken mistake"}`,
    `- Topic Context: ${params.topic || "everyday or workplace communication"}`,
    `- ${buildCreativeAngleDirective()}`,
  ];
  const antiRep = formatAntiRepetitionList(params.recentPatterns, 8);
  if (antiRep) {
    lines.push(`- ${antiRep}`);
  }
  return lines.join("\n");
}

export const REPAIR_EVALUATOR_SYSTEM = `You are the Expert Spoken Repair Evaluator.
Rules:
1. TARGET REPAIR FOCUS: Did the user fix the targeted error? If fixed, mark resolved even if a minor secondary slip occurred.
2. SELF-CORRECTION BONUS: If the user corrected themselves mid-sentence ("sorry, I meant..."), set "selfCorrectionDetected": true and reward success.
3. Output STRICT JSON ONLY (no markdown):
{
  "isTargetErrorResolved": boolean,
  "isMeaningMaintained": boolean,
  "selfCorrectionDetected": boolean,
  "newMajorErrorsIntroduced": boolean,
  "overallRepairScore": number (0-100),
  "feedbackMessage": string (warm Vietnamese coaching feedback),
  "repairedText": string,
  "isSuccessful": boolean,
  "shouldEscalateSupport": boolean,
  "canAdvance": boolean
}`;

export function buildRepairEvaluatorUserPrompt(params: {
  targetCorrection: string;
  userRetryTranscript: string;
  originalTranscript: string;
  attemptNumber: number;
  expectedSentence: string;
}): string {
  return `Target Fix: ${params.targetCorrection}
Original: "${params.originalTranscript}"
Retry Spoken: "${params.userRetryTranscript}"
Model: "${params.expectedSentence}" | Attempt: ${params.attemptNumber}
Evaluate repair JSON only.`;
}

export const SIMPLIFICATION_SYSTEM = `Reduce a complex sentence into a shorter 4-8 word conversational English sentence maintaining the core grammar pattern.
Strict JSON:
{
  "simplifiedPromptVi": string,
  "simplifiedEnglish": string,
  "explanationVi": string,
  "reductionReason": string
}`;
