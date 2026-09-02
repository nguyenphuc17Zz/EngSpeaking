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
      targetModule: z.enum(["retry_lab", "latency", "sentence_builder", "vn_to_en"]),
      dailyMinutes: z.number().default(10),
    })
  ).default([]),
  motivationalQuoteVi: z.string(),
});
