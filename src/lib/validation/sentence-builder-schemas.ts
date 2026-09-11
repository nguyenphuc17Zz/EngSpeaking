import { z } from "zod";

export const taskDifficultySchema = z.object({
  overall: z.number().min(1).max(10).default(3),
  grammarComplexity: z.number().min(1).max(5).default(2),
  retrievalDemand: z.number().min(0).max(1).default(0.5),
  lengthScore: z.number().min(1).max(5).default(2),
});

export const sentenceScaffoldSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  template: z.string().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  starter: z.string().nullable().optional(),
  constraints: z.array(z.string()).default([]),
});

export const sentenceBuilderHintSchema = z.object({
  tier: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  title: z.string(),
  content: z.string(),
  penaltyWeight: z.number().default(0),
});

export const suggestedVocabularyItemSchema = z.object({
  term: z.string(),
  meaningVi: z.string().default(""),
  partOfSpeech: z.string().optional(),
  phonetic: z.string().optional(),
});

export const sentenceBuilderTaskSchema = z.object({
  id: z.string(),
  taskType: z.string().default("sentence_completion"),
  controlLevel: z.string().default("controlled"),
  instruction: z.string().default("Hãy nói câu sau sang tiếng Anh:"),
  promptVi: z.string(),
  sourceText: z.string().nullable().optional(),
  baseSentence: z.string().nullable().optional(),
  transformationType: z.string().nullable().optional(),
  targetIntent: z.string(),
  expectedResponses: z.array(z.string()).default([]),
  requiredElements: z.array(z.string()).default([]),
  scaffold: sentenceScaffoldSchema,
  hints: z.array(sentenceBuilderHintSchema).default([]),
  suggestedVocabulary: z.array(suggestedVocabularyItemSchema).default([]),
  difficulty: taskDifficultySchema,
  skills: z.array(z.string()).default(["sentence_construction"]),
  grammarTargets: z.array(z.string()).default([]),
  vocabularyTargets: z.array(z.string()).default([]),
  topic: z.string().default("daily_life"),
  prepTimeSec: z.number().default(3.0),
  targetErrorPatternKey: z.string().optional(),
});

export const evaluatedErrorSchema = z.object({
  type: z.enum(["grammar", "vocabulary", "naturalness", "omission", "word_order"]),
  severity: z.enum(["minor", "major"]),
  userText: z.string(),
  correction: z.string(),
  explanation: z.string(),
  patternKey: z.string().optional(),
});

export const hesitationMetricsSchema = z.object({
  wpm: z.number().default(0),
  durationMs: z.number().default(0),
  hesitationLevel: z.enum(["smooth", "moderate", "hesitant"]).default("smooth"),
  pauseEstimatedSec: z.number().default(0),
});

export const sentenceBuilderEvaluationSchema = z.object({
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
  userTranscript: z.string().default(""),
  cleanTranscript: z.string().default(""),
  latencyMs: z.number().default(0),
  speechDurationMs: z.number().default(0),
  errors: z.array(evaluatedErrorSchema).default([]),
  betterVersion: z.string(),
  simplifiedVersion: z.string().optional(),
  praisePoints: z.array(z.string()).default([]),
  actionableFeedback: z.string(),
  hintTierUsed: z.number().default(0),
  attemptNumber: z.number().default(1),
  evaluationSource: z.enum(["fast_pass", "ai_llm", "deterministic"]).optional(),
  hesitationMetrics: hesitationMetricsSchema.optional(),
});
