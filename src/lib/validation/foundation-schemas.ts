import { z } from "zod";

export const foundationSkillSchema = z.enum([
  "sentence_retrieval",
  "chunk_retrieval",
  "sentence_construction",
  "sentence_expansion",
  "substitution",
  "speaking_repetition",
  "shadowing",
  "controlled_speaking",
  "response_speed",
  "active_vocabulary",
  "grammar_in_speech",
  "conversation_followup",
  "micro_monologue",
  "recovery",
  "self_correction",
  "confidence",
]);

export const foundationExerciseTypeSchema = z.enum([
  "repeat",
  "shadow",
  "chunk_practice",
  "pattern_practice",
  "substitution",
  "one_sentence",
  "answer_expansion",
  "controlled_speaking",
  "timed_speaking",
  "rapid_response",
  "follow_up",
  "stimulus_speaking",
  "translation_bridge",
  "vocabulary_activation",
  "grammar_speaking",
  "pronunciation_micro",
  "confidence",
  "recovery",
  "self_correction",
  "repeat_until_better",
  "micro_monologue",
]);

export const speakingConstraintSchema = z.object({
  type: z.string().min(1),
  instruction: z.string().min(1),
  target: z.string().optional(),
});

export const foundationExerciseSchema = z.object({
  id: z.string().min(1),
  skill: foundationSkillSchema,
  type: foundationExerciseTypeSchema,
  level: z.number().int().min(0).max(10),
  difficulty: z.number().min(1).max(10),
  instruction: z.string().min(5),
  prompt: z.string().optional(),
  targetPhrase: z.string().optional(),
  targetPattern: z.string().optional(),
  constraints: z.array(speakingConstraintSchema).optional(),
  expectedDurationSec: z.number().int().min(5).max(180).optional(),
  hintPolicy: z
    .object({
      maxHints: z.number().int().min(0).max(5),
      allowSentenceStarter: z.boolean(),
      allowModelAnswer: z.boolean(),
    })
    .optional(),
  evaluationCriteria: z
    .array(z.object({ dimension: z.string(), weight: z.number(), description: z.string() }))
    .min(1),
  topic: z.string().optional(),
  source: z.enum(["ai", "mock", "bank"]).optional(),
});

export const foundationScoreSchema = z.object({
  completion: z.number().min(0).max(100),
  responseSpeed: z.number().min(0).max(100),
  sentenceFormation: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100),
  retrieval: z.number().min(0).max(100),
  expansion: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  recovery: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  fillerCount: z.number().optional(),
  pauseBehavior: z.enum(["natural", "excessive", "none"]).optional(),
  insufficientEvidence: z.boolean().optional(),
});

export const foundationFeedbackSchema = z.object({
  whatWentWell: z.string().min(1),
  mainIssue: z.string().nullable(),
  betterVersion: z.string().nullable(),
  tryAgain: z.string().min(1),
  nextMicroGoal: z.string().min(1),
  fillerNote: z.string().nullable().optional(),
});

export const foundationEvaluationSchema = z.object({
  score: foundationScoreSchema,
  feedback: foundationFeedbackSchema,
  classification: z.enum(["too_easy", "appropriate", "too_hard"]),
  suggestedDifficultyDelta: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  hintsUsed: z.number().int().min(0),
  timeToFirstWordMs: z.number().optional(),
  durationMs: z.number().optional(),
});

// Request schemas
export const generateExerciseRequestSchema = z.object({
  skill: foundationSkillSchema.optional(),
  type: foundationExerciseTypeSchema.optional(),
  difficulty: z.number().min(1).max(10).optional(),
  level: z.number().int().min(0).max(10).optional(),
  mode: z.enum(["learn", "practice", "challenge", "daily"]).optional(),
  topic: z.string().optional(),
  previousPerformance: z.string().optional(),
  speechBank: z.array(z.string()).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});

export const evaluateRequestSchema = z.object({
  exercise: foundationExerciseSchema,
  transcript: z.string().min(1),
  rawTranscript: z.string().optional(),
  durationMs: z.number().optional(),
  timeToFirstWordMs: z.number().optional(),
  hintsUsed: z.number().int().min(0).optional(),
  hintLevel: z.number().int().min(0).max(4).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});

export const hintRequestSchema = z.object({
  exercise: foundationExerciseSchema,
  transcript: z.string().optional(),
  hintLevel: z.number().int().min(0).max(4),
  attemptsCount: z.number().int().min(0).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});
