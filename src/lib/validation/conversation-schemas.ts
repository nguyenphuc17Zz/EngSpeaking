import { z } from "zod";

export const conversationModeSchema = z.enum([
  "free","casual","daily_life","social","travel","workplace","professional","interview","debate","storytelling","presentation","random","ai_generated","custom",
]);

export const dynamicEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  trigger: z.string().optional(),
  probability: z.number().min(0).max(1).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  effect: z.string().min(1),
});

export const scenarioBlueprintSchema = z.object({
  id: z.string().min(1),
  mode: conversationModeSchema,
  topic: z.string().min(1),
  setting: z.string().min(1),
  character: z.object({
    name: z.string().optional(),
    role: z.string().min(1),
    personality: z.string().min(1),
    communicationStyle: z.string().min(1),
  }),
  userGoal: z.string().min(1),
  aiGoal: z.string().min(1),
  difficulty: z.number().int().min(1).max(10),
  difficultyLabel: z.enum(["easy","normal","hard","extreme","auto"]).optional(),
  context: z.string().min(1),
  conflict: z.string().optional(),
  conflictIntensity: z.enum(["none","low","medium","high"]).optional(),
  possibleEvents: z.array(dynamicEventSchema).default([]),
  speakingObjectives: z.array(z.object({ type: z.string(), description: z.string(), hidden: z.boolean().optional() })).default([]),
  schemaVersion: z.number().int().optional(),
});

export const characterStateSchema = z.object({
  mood: z.string().min(1),
  trust: z.number().min(0).max(100),
  patience: z.number().min(0).max(100),
  engagement: z.number().min(0).max(100),
  name: z.string().optional(),
  role: z.string().optional(),
});

export const conversationFactSchema = z.object({
  id: z.string().min(1),
  fact: z.string().min(1),
  createdAt: z.string().min(1),
});

export const conversationWorldStateSchema = z.object({
  scenario: scenarioBlueprintSchema,
  currentObjective: z.string().min(1),
  currentTopic: z.string().min(1),
  activeCharacter: characterStateSchema,
  conversationFacts: z.array(conversationFactSchema).default([]),
  unresolvedThreads: z.array(z.string()).default([]),
  resolvedThreads: z.array(z.string()).optional(),
  activeEvents: z.array(dynamicEventSchema).default([]),
  turnCount: z.number().int().min(0),
  surpriseLevel: z.enum(["low","medium","high","extreme"]),
  pressure: z.enum(["relaxed","normal","challenging","pressure"]),
});

export const conversationSummarySchema = z.object({
  summary: z.string().min(1),
  keyFacts: z.array(conversationFactSchema).default([]),
  activeThreads: z.array(z.string()).default([]),
  resolvedThreads: z.array(z.string()).default([]),
  characterState: characterStateSchema,
});

export const turnSayItBetterSchema = z.object({
  professional: z.string(),
  casual: z.string(),
  idiomatic: z.string(),
});

export const turnEvaluatedErrorSchema = z.object({
  type: z.enum(["grammar", "vocabulary", "pronunciation", "fluency", "omission", "strategy"]),
  severity: z.enum(["minor", "major"]),
  userText: z.string(),
  correction: z.string(),
  explanation: z.string(),
  patternKey: z.string().optional(),
});

export const turnHesitationSchema = z.object({
  wpm: z.number(),
  durationMs: z.number(),
  hesitationLevel: z.enum(["smooth", "moderate", "hesitant"]),
  pauseEstimatedSec: z.number(),
});

export const conversationAIResponseSchema = z.object({
  responseText: z.string().min(1),
  stateUpdate: z.object({
    currentTopic: z.string().optional(),
    objectiveProgress: z.number().optional(),
    moodChange: z.number().optional(),
    trustChange: z.number().optional(),
    patienceChange: z.number().optional(),
    engagementChange: z.number().optional(),
    defensivenessChange: z.number().optional(),
    emotionalValenceChange: z.number().optional(),
    newFacts: z.array(conversationFactSchema).optional(),
    newThreads: z.array(z.string()).optional(),
    resolvedThreads: z.array(z.string()).optional(),
  }).optional(),
  event: dynamicEventSchema.optional(),
  pragmaticAct: z.string().optional(),
  pragmaticFeedbackVi: z.string().optional(),
  pedagogy: z.object({
    grammarIssue: z.string().nullable().optional(),
    grammarFix: z.string().nullable().optional(),
    nativeReformulation: z.string().optional(),
    turnScore: z.number().optional(),
    coachTipVi: z.string().optional(),
    speechRateWpm: z.number().optional(),
    lexicalDiversityTtr: z.number().optional(),
    meaningScore: z.number().min(0).max(100).optional(),
    fluencyScore: z.number().min(0).max(100).optional(),
    retrievalScore: z.number().min(0).max(100).optional(),
    independenceScore: z.number().min(0).max(100).optional().default(100),
    errors: z.array(turnEvaluatedErrorSchema).optional().default([]),
    praisePoints: z.array(z.string()).optional().default([]),
    actionableFeedback: z.string().optional().default(""),
    sayItBetter: turnSayItBetterSchema.optional(),
    naturalAlternatives: z
      .array(z.object({ expression: z.string(), tone: z.string(), explanationVi: z.string().optional() }))
      .optional()
      .default([]),
    isSayItBetterNeeded: z.boolean().optional().default(false),
    hintTierUsed: z.number().min(0).max(4).optional().default(0),
    attemptNumber: z.number().min(1).optional().default(1),
    evaluationSource: z.enum(["fast_pass", "ai_llm", "deterministic"]).optional().default("ai_llm"),
    hesitationMetrics: turnHesitationSchema.optional(),
    isFastPass: z.boolean().optional().default(false),
  }).optional(),
  hints: z.object({
    tier1Keywords: z.array(z.object({ term: z.string(), meaning: z.string(), penaltyWeight: z.number().min(0).max(1).optional() })).optional(),
    tier2Starters: z.array(z.object({ starter: z.string(), meaning: z.string(), penaltyWeight: z.number().min(0).max(1).optional() })).optional(),
    tier3FullAnswer: z.object({ en: z.string(), vi: z.string(), penaltyWeight: z.number().min(0).max(1).optional() }).optional(),
  }).optional(),
});

export const conversationTurnRequestSchema = z.object({
  worldId: z.string().optional(),
  transcript: z.string().min(1),
  speechDurationMs: z.number().optional().default(2500),
  hintTierUsed: z.number().min(0).max(4).optional().default(0),
  attemptNumber: z.number().min(1).optional().default(1),
  recentErrors: z.array(z.string()).optional().default([]),
  pedagogicalConstraint: z.string().optional(),
});

export const conversationSettingsSchema = z.object({
  mode: conversationModeSchema,
  difficulty: z.enum(["easy","normal","hard","extreme","auto"]),
  duration: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  characterStyle: z.enum(["friendly","neutral","professional","serious","difficult","random","auto"]),
  surpriseLevel: z.enum(["low","medium","high","extreme"]),
  conflictIntensity: z.enum(["none","low","medium","high"]),
  pressure: z.enum(["relaxed","normal","challenging","pressure"]),
  topic: z.string().optional(),
  setting: z.string().optional(),
  surpriseMe: z.boolean().optional(),
  aiPrompt: z.string().optional(),
  sessionMode: z.enum(["endless", "quick", "standard", "deep"]).optional().default("endless"),
  targetCount: z.number().int().min(0).max(50).optional().default(0),
  prepTimeSec: z.number().min(1).max(5).optional().default(2.5),
  recentErrors: z.array(z.string()).optional().default([]),
  pedagogicalConstraint: z.string().optional(),
});
