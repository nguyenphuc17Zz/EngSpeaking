import { z } from "zod";

export const bufferChunkCandidateSchema = z.object({
  phrase: z.string(),
  meaningVi: z.string(),
  category: z.enum(["buying_time", "framing_opinion", "immediate_reaction"]).default("buying_time"),
});

export const latencyTaskSchema = z.object({
  id: z.string(),
  drillMode: z.enum(["open_response", "rapid_retrieval", "timed_countdown", "baseline_test"]).default("open_response"),
  promptText: z.string(),
  promptLanguage: z.enum(["en", "vi"]).default("en"),
  targetIntent: z.string(),
  expectedKeywords: z.array(z.string()).default([]),
  sampleResponses: z.array(z.string()).default([]),
  targetLatencyMs: z.number().default(3000),
  difficulty: z.number().min(1).max(10).default(3),
  category: z.enum(["daily_conversation", "workplace", "opinions", "past_events", "reactions", "buffer_phrases"]).default("daily_conversation"),
  bufferPhraseSuggestion: z.string().optional(),
  bufferChunks: z.array(bufferChunkCandidateSchema).optional(),
  staircaseTargetMs: z.number().optional(),
  isBaseline: z.boolean().default(false),
  hints: z
    .array(
      z.object({
        tier: z.number(),
        title: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  suggestedVocabulary: z
    .array(
      z.object({
        term: z.string(),
        meaningVi: z.string(),
        partOfSpeech: z.string().optional(),
        phonetic: z.string().optional(),
      })
    )
    .optional(),
});

export const hesitationProfileSchema = z.object({
  fillerCount: z.number().default(0),
  fillersDetected: z.array(z.string()).default([]),
  fillersPerMinute: z.number().default(0),
  pauseCount: z.number().default(0),
  selfCorrectionDetected: z.boolean().default(false),
});

export const latencyEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  accuracyScore: z.number().min(0).max(100),
  naturalnessScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  responseLatencyMs: z.number().default(0),
  speechDurationMs: z.number().default(0),
  targetLatencyMs: z.number().default(3000),
  latencyRatio: z.number().default(1.0),
  quadrant: z.enum(["fast_correct", "slow_correct", "fast_incorrect", "slow_incorrect"]).default("fast_correct"),
  latencyStatus: z.enum(["excellent", "strong", "moderate", "slow", "very_slow"]).default("strong"),
  likelyCause: z.enum(["automatic", "spoken_retrieval", "grammar_calculation", "vocabulary_search", "hesitation"]).default("automatic"),
  hesitation: hesitationProfileSchema.default({
    fillerCount: 0,
    fillersDetected: [],
    fillersPerMinute: 0,
    pauseCount: 0,
    selfCorrectionDetected: false,
  }),
  userTranscript: z.string().default(""),
  cleanTranscript: z.string().default(""),
  isSuccessful: z.boolean().default(true),
  coachFeedbackVi: z.string(),
  betterResponse: z.string(),
  praisePoints: z.array(z.string()).default([]),
  isFastPass: z.boolean().optional(),
  bufferUsed: z.string().optional(),
  speechOnsetMs: z.number().optional(),
});
