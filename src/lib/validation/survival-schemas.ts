import { z } from "zod";

export const propertyHintLadderSchema = z.object({
  functionHint: z.string().optional(),
  categoryHint: z.string().optional(),
  contextHint: z.string().optional(),
  starterHint: z.string().optional(),
});

export const survivalHintTierSchema = z.object({
  tier: z.number(),
  title: z.string(),
  content: z.string(),
  penaltyWeight: z.number().min(0).max(1).optional().default(0),
});

export const survivalSayItBetterSchema = z.object({
  professional: z.string(),
  casual: z.string(),
  idiomatic: z.string(),
});

export const survivalEvaluatedErrorSchema = z.object({
  type: z.enum(["taboo", "grammar", "vocabulary", "naturalness", "omission", "strategy"]),
  severity: z.enum(["minor", "major"]),
  userText: z.string(),
  correction: z.string(),
  explanation: z.string(),
  patternKey: z.string().optional(),
});

export const survivalHesitationSchema = z.object({
  wpm: z.number(),
  durationMs: z.number(),
  hesitationLevel: z.enum(["smooth", "moderate", "hesitant"]),
  pauseEstimatedSec: z.number(),
});

export const survivalVocabularyItemSchema = z.object({
  term: z.string(),
  meaningVi: z.string(),
  partOfSpeech: z.string().optional(),
  phonetic: z.string().optional(),
});

export const circumlocutionTaskSchema = z.object({
  id: z.string(),
  targetWord: z.string(),
  forbiddenWords: z.array(z.string()).default([]),
  vietnameseMeaning: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  difficultyOverall: z.number().min(1).max(10).optional().default(5),
  timeLimitSeconds: z.number().default(5),
  hints: propertyHintLadderSchema.optional().default({}),
  tierHints: z.array(survivalHintTierSchema).optional(),
  sampleExplanations: z.array(z.string()).default([]),
  suggestedVocabulary: z.array(survivalVocabularyItemSchema).optional(),
  genus: z.string().optional(),
  differentia: z.string().optional(),
  semanticKeyAnchors: z.array(z.string()).default([]),
  tabooLemmas: z.array(z.string()).default([]),
  source: z.enum(["ai", "bank", "seed"]).optional(),
  topic: z.string().optional().default("general"),
  prepTimeSec: z.number().optional().default(2.5),
  skills: z.array(z.string()).optional().default([]),
  sayItBetter: survivalSayItBetterSchema.optional(),
});

export const survivalScenarioTaskSchema = z.object({
  id: z.string(),
  context: z.string(),
  contextTitleVi: z.string(),
  problemDescriptionVi: z.string(),
  audioPromptText: z.string(),
  recommendedSkill: z.string().default("asking_repetition"),
  suggestedRepairPhrases: z.array(z.string()).default([]),
  timeLimitSeconds: z.number().default(5),
  tierHints: z.array(survivalHintTierSchema).optional(),
  suggestedVocabulary: z.array(survivalVocabularyItemSchema).optional(),
  source: z.enum(["ai", "bank", "seed"]).optional(),
  topic: z.string().optional().default("general"),
  prepTimeSec: z.number().optional().default(2.0),
  difficultyOverall: z.number().min(1).max(10).optional().default(5),
  skills: z.array(z.string()).optional().default([]),
  sayItBetter: survivalSayItBetterSchema.optional(),
});

export const survivalEvaluationSchema = z.object({
  isSuccessful: z.boolean(),
  communicationRecovered: z.boolean().default(true),
  strategyUsed: z.string().default("circumlocution"),
  targetWordAvoided: z.boolean().optional(),
  conceptClarityScore: z.number().min(0).max(100),
  genusDetected: z.boolean().optional(),
  differentiaDetected: z.boolean().optional(),
  semanticPrecisionScore: z.number().min(0).max(100).optional(),
  listenerGuess: z.string().optional(),
  clarityBreakdown: z
    .object({
      genusScore: z.number().default(0),
      functionScore: z.number().default(0),
      ambiguityPenalty: z.number().default(0),
    })
    .optional(),
  repairInitiationLatencyMs: z.number().default(2000),
  speechDurationMs: z.number().optional().default(2500),
  naturalnessScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100).optional().default(75),
  retrievalScore: z.number().min(0).max(100).optional().default(75),
  independenceScore: z.number().min(0).max(100).optional().default(100),
  errors: z.array(survivalEvaluatedErrorSchema).optional().default([]),
  praisePoints: z.array(z.string()).optional().default([]),
  actionableFeedback: z.string().optional().default(""),
  sayItBetter: survivalSayItBetterSchema.optional(),
  naturalAlternatives: z
    .array(z.object({ expression: z.string(), tone: z.string(), explanationVi: z.string().optional() }))
    .optional()
    .default([]),
  isSayItBetterNeeded: z.boolean().optional().default(false),
  userTranscript: z.string(),
  cleanTranscript: z.string().optional().default(""),
  coachFeedbackVi: z.string(),
  idealRepairVersion: z.string(),
  alternativeStrategies: z.array(z.string()).default([]),
  hintTierUsed: z.number().min(0).max(4).optional().default(0),
  attemptNumber: z.number().min(1).optional().default(1),
  evaluationSource: z.enum(["fast_pass", "ai_llm", "deterministic"]).optional().default("ai_llm"),
  hesitationMetrics: survivalHesitationSchema.optional(),
  isFastPass: z.boolean().optional().default(false),
});
