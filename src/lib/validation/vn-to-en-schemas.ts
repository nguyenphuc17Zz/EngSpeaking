import { z } from "zod";

export const vnToENHintSchema = z.object({
  tier: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  title: z.string(),
  content: z.string(),
  penaltyWeight: z.number().default(0),
});

export const semanticAlternativeSchema = z.object({
  expression: z.string(),
  tone: z.enum(["neutral", "casual", "formal", "idiomatic"]).default("neutral"),
  explanationVi: z.string().optional(),
});

export const suggestedVocabularyItemSchema = z.object({
  term: z.string(),
  meaningVi: z.string().default(""),
  partOfSpeech: z.string().optional(),
  phonetic: z.string().optional(),
});

export const sayItBetterSchema = z.object({
  professional: z.string().default(""),
  casual: z.string().default(""),
  idiomatic: z.string().default(""),
});

export const vnToENTaskSchema = z.object({
  id: z.string(),
  category: z.string().default("daily_life"),
  retrievalMode: z.string().default("direct"),
  promptVi: z.string(),
  targetIntent: z.string(),
  expectedResponses: z.array(z.string()).default([]),
  requiredMeaningElements: z.array(z.string()).default([]),
  targetSkills: z.array(z.string()).default([]),
  difficulty: z.object({
    overall: z.coerce.number().default(3),
    grammarComplexity: z.coerce.number().default(2),
    retrievalDemand: z.coerce.number().default(0.5),
    semanticDensity: z.coerce.number().default(2),
  }).default({ overall: 3, grammarComplexity: 2, retrievalDemand: 0.5, semanticDensity: 2 }),
  hints: z.array(vnToENHintSchema).default([]),
  suggestedVocabulary: z.array(suggestedVocabularyItemSchema).default([]),
  sayItBetter: sayItBetterSchema.optional(),
  prepTimeSec: z.coerce.number().default(2.5),
  isRapidFire: z.boolean().default(false),
  topic: z.string().default("general"),
  source: z.enum(["ai", "bank"]).optional(),
});

export const vnEvaluatedErrorSchema = z.object({
  type: z.enum(["grammar", "vocabulary", "article", "preposition", "word_order", "omission"]),
  severity: z.enum(["minor", "major"]),
  userText: z.string(),
  correction: z.string(),
  explanation: z.string(),
  patternKey: z.string().optional(),
});

export const vnToENEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  meaningScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  naturalnessScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  retrievalScore: z.number().min(0).max(100),
  independenceScore: z.number().min(0).max(100),
  isCommunicativelyValid: z.boolean(),
  isSuccessful: z.boolean(),
  needsRetry: z.boolean(),
  isSayItBetterNeeded: z.boolean().default(false),
  gapType: z.enum(["none", "knowledge_gap", "retrieval_gap", "production_gap"]).default("none"),
  gapExplanation: z.string().optional(),
  userTranscript: z.string().default(""),
  cleanTranscript: z.string().default(""),
  responseLatencyMs: z.number().default(0),
  speechDurationMs: z.number().default(0),
  errors: z.array(vnEvaluatedErrorSchema).default([]),
  betterVersion: z.string(),
  naturalAlternatives: z.array(semanticAlternativeSchema).default([]),
  sayItBetter: sayItBetterSchema.optional(),
  isFastPass: z.boolean().optional(),
  praisePoints: z.array(z.string()).default([]),
  actionableFeedback: z.string(),
  hintTierUsed: z.number().default(0),
  attemptNumber: z.number().default(1),
});
