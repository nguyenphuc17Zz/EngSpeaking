import { z } from "zod";

export const repairDiffTokenSchema = z.object({
  text: z.string(),
  status: z.enum(["repaired", "unchanged", "error_persisted", "inserted", "deleted"]),
  isTargetFix: z.boolean().optional(),
});

export const conversationalTrapSchema = z.object({
  partnerUtterance: z.string(),
  reactionPromptVi: z.string(),
  suggestedStarter: z.string().optional(),
});

export const targetedCorrectionSchema = z.object({
  errorType: z.enum(["grammar", "vocabulary", "article", "preposition", "word_order", "omission", "naturalness"]).default("grammar"),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(2),
  patternKey: z.string().default("general_grammar"),
  whatToFix: z.string(),
  userErroneousText: z.string(),
  minimalCorrection: z.string(),
  explanationVi: z.string(),
  betterSentence: z.string(),
  skeletonHint: z.string().optional(),
  simplifiedSentence: z.string().optional(),
  conversationalTrap: conversationalTrapSchema.optional(),
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

export const repairChallengeSchema = z.object({
  id: z.string(),
  category: z.string().default("grammar"),
  topic: z.string().default("general"),
  situationVi: z.string(),
  targetIntent: z.string(),
  erroneousSentence: z.string(),
  userErroneousText: z.string(),
  whatToFix: z.string(),
  explanationVi: z.string(),
  betterSentence: z.string(),
  skeletonHint: z.string().optional(),
  simplifiedSentence: z.string().optional(),
  conversationalTrap: conversationalTrapSchema.optional(),
  hints: z
    .array(
      z.object({
        tier: z.number(),
        title: z.string(),
        content: z.string(),
      })
    )
    .default([]),
  suggestedVocabulary: z
    .array(
      z.object({
        term: z.string(),
        meaningVi: z.string(),
        partOfSpeech: z.string().optional(),
        phonetic: z.string().optional(),
      })
    )
    .default([]),
  source: z.enum(["ai", "bank"]).optional(),
});

export const repairEvaluationResultSchema = z.object({
  isTargetErrorResolved: z.boolean(),
  isMeaningMaintained: z.boolean(),
  selfCorrectionDetected: z.boolean().default(false),
  newMajorErrorsIntroduced: z.boolean().default(false),
  overallRepairScore: z.number().min(0).max(100),
  feedbackMessage: z.string(),
  repairedText: z.string().default(""),
  isSuccessful: z.boolean(),
  shouldEscalateSupport: z.boolean().default(false),
  canAdvance: z.boolean().default(false),
  isFastPass: z.boolean().optional(),
  isMidSpeechSelfCorrection: z.boolean().optional(),
  diffTokens: z.array(repairDiffTokenSchema).optional(),
});

export const simplificationResultSchema = z.object({
  simplifiedPromptVi: z.string(),
  simplifiedEnglish: z.string(),
  explanationVi: z.string(),
  reductionReason: z.string(),
});
