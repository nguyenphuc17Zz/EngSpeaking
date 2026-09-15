import { z } from "zod";

export const mainErrorCategorySchema = z.enum(["grammar", "vocabulary", "pronunciation", "fluency"]);
export const errorSeveritySchema = z.enum(["minor", "moderate", "major", "critical"]);
export const errorStatusSchema = z.enum(["new", "active", "persistent", "recovering", "stable", "mastered"]);
export const gapTypeSchema = z.enum(["knowledge_gap", "retrieval_gap", "production_gap", "pronunciation_gap"]);

export const normalizedErrorSchema = z.object({
  patternKey: z.string(),
  canonicalName: z.string(),
  category: mainErrorCategorySchema,
  subCategory: z.string().optional(),
  labelVi: z.string(),
  descriptionVi: z.string(),
  severity: errorSeveritySchema.default("moderate"),
  gapType: gapTypeSchema.default("knowledge_gap"),
  confidenceScore: z.number().min(0).max(1).default(0.9),
  explanationVi: z.string(),
});

export const errorFeedbackReportSchema = z.object({
  errorRecordId: z.string(),
  feedbackType: z.enum(["false_positive_stt", "wrong_correction", "already_mastered", "request_review"]),
  notes: z.string().optional(),
});

export const drillSayItBetterSchema = z.object({
  professional: z.string(),
  casual: z.string(),
  idiomatic: z.string(),
});

export const drillEvaluatedErrorSchema = z.object({
  type: z.enum(["grammar", "vocabulary", "pronunciation", "fluency", "omission", "strategy"]),
  severity: z.enum(["minor", "major"]),
  userText: z.string(),
  correction: z.string(),
  explanation: z.string(),
  patternKey: z.string().optional(),
});

export const drillHesitationSchema = z.object({
  wpm: z.number(),
  durationMs: z.number(),
  hesitationLevel: z.enum(["smooth", "moderate", "hesitant"]),
  pauseEstimatedSec: z.number(),
});

export const drillEvaluationSchema = z.object({
  corrected: z.boolean(),
  overallScore: z.number().min(0).max(100),
  targetErrorResolved: z.boolean().default(true),
  grammarAccuracy: z.number().min(0).max(100).default(75),
  naturalness: z.number().min(0).max(100).default(75),
  conceptClarityScore: z.number().min(0).max(100).optional().default(80),
  fluencyScore: z.number().min(0).max(100).optional().default(75),
  retrievalScore: z.number().min(0).max(100).optional().default(75),
  independenceScore: z.number().min(0).max(100).optional().default(100),
  errors: z.array(drillEvaluatedErrorSchema).optional().default([]),
  praisePoints: z.array(z.string()).optional().default([]),
  actionableFeedback: z.string().optional().default(""),
  sayItBetter: drillSayItBetterSchema.optional(),
  naturalAlternatives: z
    .array(z.object({ expression: z.string(), tone: z.string(), explanationVi: z.string().optional() }))
    .optional()
    .default([]),
  isSayItBetterNeeded: z.boolean().optional().default(false),
  coachFeedbackVi: z.string(),
  betterPhrasing: z.string().optional(),
  userTranscript: z.string().optional().default(""),
  cleanTranscript: z.string().optional().default(""),
  hintTierUsed: z.number().min(0).max(4).optional().default(0),
  attemptNumber: z.number().min(1).optional().default(1),
  evaluationSource: z.enum(["fast_pass", "ai_llm", "deterministic"]).optional().default("ai_llm"),
  hesitationMetrics: drillHesitationSchema.optional(),
  isFastPass: z.boolean().optional().default(false),
});

export const spokenDiagnosticReportSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  primaryBottleneckVi: z.string(),
  retrievalVsKnowledgeRatio: z.object({
    retrievalGapPercent: z.number().min(0).max(100),
    knowledgeGapPercent: z.number().min(0).max(100),
    explanationVi: z.string(),
  }),
  l1InterferencePatterns: z.array(
    z.object({
      vietnameseHabit: z.string(),
      naturalEnglishAlternative: z.string(),
      explanationVi: z.string(),
    })
  ).default([]),
  prescriptions: z.array(
    z.object({
      id: z.string(),
      titleVi: z.string(),
      actionDescriptionVi: z.string(),
      targetModule: z.enum(["retry_lab", "latency", "sentence_builder", "vn_to_en", "survival"]),
      dailyMinutes: z.number().default(10),
    })
  ).default([]),
  motivationalQuoteVi: z.string(),
});
