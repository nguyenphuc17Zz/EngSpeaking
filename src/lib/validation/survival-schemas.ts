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
  timeLimitSeconds: z.number().default(5),
  hints: propertyHintLadderSchema.optional().default({}),
  tierHints: z.array(survivalHintTierSchema).optional(),
  sampleExplanations: z.array(z.string()).default([]),
  suggestedVocabulary: z.array(survivalVocabularyItemSchema).optional(),
  genus: z.string().optional(),
  differentia: z.string().optional(),
  semanticKeyAnchors: z.array(z.string()).default([]),
  tabooLemmas: z.array(z.string()).default([]),
  source: z.enum(["ai", "bank"]).optional(),
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
  source: z.enum(["ai", "bank"]).optional(),
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
  naturalnessScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  userTranscript: z.string(),
  coachFeedbackVi: z.string(),
  idealRepairVersion: z.string(),
  alternativeStrategies: z.array(z.string()).default([]),
});
