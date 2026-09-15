import { z } from "zod";

export const advancedTrainingTypeSchema = z.enum([
  "rapidResponse","pressureConversation","topicSwitching","unexpectedQuestion","deepFollowup","opinion","debate","persuasion","negotiation","storytelling","longForm","presentation","qaChallenge","interview","professional","clarification","resilience","ambiguity","escalation","reformulation","spontaneous","abstract","roleReversal","devilsAdvocate","highPressure"
]);

export const difficultyConfigSchema = z.object({
  responsePressure: z.number().min(0).max(10).optional(),
  topicNovelty: z.number().min(0).max(10).optional(),
  abstractness: z.number().min(0).max(10).optional(),
  conversationComplexity: z.number().min(0).max(10).optional(),
  characterDifficulty: z.number().min(0).max(10).optional(),
  numberOfConstraints: z.number().min(0).max(10).optional(),
  eventFrequency: z.number().min(0).max(10).optional(),
  supportLevel: z.number().min(0).max(10).optional(),
  level: z.string().optional(),
}).passthrough();

export const advancedTrackSchema = z.enum(["reflex", "argument", "extended"]);
export const advancedLevelSchema = z.enum(["L1", "L2", "L3"]);

export const advancedTrainingContextSchema = z.object({
  targetSkills: z.array(z.string()).default([]),
  goal: z.string().optional(),
  difficulty: difficultyConfigSchema.optional(),
  durationMinutes: z.number().int().min(1).max(60),
  pressureLevel: z.string().optional(),
  topic: z.string().optional(),
  scenario: z.string().optional(),
  communicationObjective: z.string().optional(),
  userPreferences: z.record(z.string(), z.unknown()).optional(),
  // New track/level routing (optional for backward-compat)
  track: advancedTrackSchema.optional(),
  level: advancedLevelSchema.optional(),
});

export const advancedTrainingBlockSchema = z.object({
  id: z.string().min(1),
  type: advancedTrainingTypeSchema,
  objective: z.string().min(1),
  skillTargets: z.array(z.string()),
  difficulty: difficultyConfigSchema,
  estimatedDurationMinutes: z.number().int().min(1).max(30),
  instructions: z.string().min(1),
  scenario: z.unknown().optional(),
  constraints: z.array(z.string()).optional(),
  timeLimitSec: z.number().min(1).max(60).optional(),
  requiredToulminElements: z.array(z.string()).optional(),
});

export const advancedChallengeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  trigger: z.string().min(1),
  purpose: z.string().min(1),
  effect: z.string().min(1),
});

export const advancedTrainingSessionSchema = z.object({
  id: z.string().min(1),
  modules: z.array(z.string()),
  blocks: z.array(advancedTrainingBlockSchema).min(1),
  challenges: z.array(advancedChallengeSchema),
  context: advancedTrainingContextSchema,
  createdAt: z.string().min(1),
  estimatedDurationMinutes: z.number().int().min(1).max(60),
  rationale: z.string().optional(),
});

export const advancedGenerationResultSchema = z.object({
  session: advancedTrainingSessionSchema,
  rationale: z.string().optional(),
});

export const advancedTaskHintSchema = z.object({
  tier: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  title: z.string(),
  content: z.string(),
  penaltyWeight: z.number().default(0),
});

export const advancedSayItBetterSchema = z.object({
  professional: z.string().default(""),
  casual: z.string().default(""),
  idiomatic: z.string().default(""),
});

export const advancedTaskDifficultySchema = z.object({
  overall: z.coerce.number().default(4),
  grammarComplexity: z.coerce.number().default(3),
  retrievalDemand: z.coerce.number().default(0.6),
  semanticDensity: z.coerce.number().default(3),
});

export const advancedTaskSchema = z.object({
  id: z.string(),
  track: advancedTrackSchema,
  level: advancedLevelSchema,
  skillTag: advancedTrainingTypeSchema,
  instruction: z.string().default("Hãy trình bày quan điểm bằng tiếng Anh:"),
  promptVi: z.string(),
  promptEN: z.string().optional(),
  scenario: z.string().optional(),
  targetIntent: z.string(),
  expectedResponses: z.array(z.string()).default([]),
  requiredMeaningElements: z.array(z.string()).default([]),
  scaffold: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
    template: z.string().nullable().optional(),
    keywords: z.array(z.string()).default([]),
    starter: z.string().nullable().optional(),
    constraints: z.array(z.string()).default([]),
  }),
  hints: z.array(advancedTaskHintSchema).default([]),
  suggestedVocabulary: z.array(z.object({
    term: z.string(),
    meaningVi: z.string().default(""),
    partOfSpeech: z.string().optional(),
    phonetic: z.string().optional(),
  })).default([]),
  sayItBetter: advancedSayItBetterSchema.optional(),
  difficulty: advancedTaskDifficultySchema.default({ overall: 4, grammarComplexity: 3, retrievalDemand: 0.6, semanticDensity: 3 }),
  skills: z.array(z.string()).default([]),
  grammarTargets: z.array(z.string()).default([]),
  vocabularyTargets: z.array(z.string()).default([]),
  topic: z.string().default("general"),
  prepTimeSec: z.coerce.number().default(2.5),
  blitzLimitSec: z.coerce.number().default(8),
  requiredToulminElements: z.array(z.string()).default(["claim", "data"]),
  targetErrorPatternKey: z.string().optional(),
  source: z.enum(["ai", "bank", "seed"]).optional(),
});

export const advancedEvaluatedErrorSchema = z.object({
  type: z.enum(["grammar", "vocabulary", "article", "preposition", "word_order", "omission", "naturalness"]),
  severity: z.enum(["minor", "major"]),
  userText: z.string(),
  correction: z.string(),
  explanation: z.string(),
  patternKey: z.string().optional(),
});

export const advancedEvaluationSchema = z.object({
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
  gapType: z.enum(["none", "retrieval_gap", "knowledge_gap", "production_gap"]).default("none"),
  gapExplanation: z.string().optional(),
  userTranscript: z.string().default(""),
  cleanTranscript: z.string().default(""),
  responseLatencyMs: z.number().default(0),
  speechDurationMs: z.number().default(0),
  errors: z.array(advancedEvaluatedErrorSchema).default([]),
  betterVersion: z.string(),
  naturalAlternatives: z.array(z.object({
    expression: z.string(),
    tone: z.enum(["neutral", "casual", "formal", "idiomatic"]).default("neutral"),
    explanationVi: z.string().optional(),
  })).default([]),
  sayItBetter: advancedSayItBetterSchema.optional(),
  isFastPass: z.boolean().optional(),
  praisePoints: z.array(z.string()).default([]),
  actionableFeedback: z.string(),
  hintTierUsed: z.number().default(0),
  attemptNumber: z.number().default(1),
  evaluationSource: z.enum(["fast_pass", "ai_llm", "deterministic"]).optional(),
});
