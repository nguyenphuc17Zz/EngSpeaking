import { z } from "zod";

export const chunkVariantSchema = z.object({
  id: z.string(),
  expression: z.string(),
  register: z.enum(["casual", "neutral", "formal"]).default("neutral"),
  exampleSentence: z.string(),
});

export const chunkRecordSchema = z.object({
  id: z.string(),
  familyKey: z.string(),
  canonicalChunk: z.string(),
  meaningVi: z.string(),
  type: z.string().default("fixed_expression"),
  difficulty: z.number().default(3),
  functionName: z.string(),
  variants: z.array(chunkVariantSchema).default([]),
  exampleSentences: z.array(z.string()).default([]),
  masteryScore: z.number().default(0),
  retrievalLatencyMs: z.number().default(3000),
  stage: z.string().default("exposure"),
  practiceCount: z.number().default(0),
  successCount: z.number().default(0),
  independentSuccessCount: z.number().default(0),
  isCustomUserChunk: z.boolean().default(false),
});

export const chunkChainBlockSchema = z.object({
  blockType: z.enum(["buffer", "stance", "reason", "example"]),
  labelVi: z.string(),
  suggestedChunk: z.string(),
  alternativeChunks: z.array(z.string()).default([]),
});

export const chunkChainTaskSchema = z.object({
  id: z.string(),
  topic: z.string(),
  situationVi: z.string(),
  targetQuestion: z.string(),
  blocks: z.array(chunkChainBlockSchema),
  expectedAssemblyExample: z.string(),
  targetLatencyMs: z.number().default(3500),
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

export const chunkTrainingTaskSchema = z.object({
  id: z.string(),
  chunk: chunkRecordSchema,
  stage: z.string().default("contextual_use"),
  situationVi: z.string(),
  contextDomain: z.enum(["workplace", "daily_life", "travel", "opinions"]).default("daily_life"),
  promptText: z.string(),
  expectedChunkUsage: z.string(),
  scaffoldText: z.string().optional(),
  targetLatencyMs: z.number().default(2500),
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

export const chunkEvaluationSchema = z.object({
  isSuccessful: z.boolean(),
  chunkDetected: z.boolean(),
  detectedExpression: z.string().optional(),
  isNaturalInsertion: z.boolean().default(true),
  retrievalLatencyMs: z.number().default(2000),
  grammarAroundChunkScore: z.number().min(0).max(100),
  naturalnessScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  userTranscript: z.string(),
  coachFeedbackVi: z.string(),
  betterVersion: z.string(),
  alternativeVariants: z.array(z.string()).default([]),
  transferDomainSuccess: z.boolean().default(true),
  masteryDelta: z.number().default(5),
});

export const chunkChainEvaluationSchema = z.object({
  isSuccessful: z.boolean(),
  overallScore: z.number().min(0).max(100),
  blocksUsedCount: z.number(),
  totalBlocks: z.number(),
  detectedBlocks: z.array(
    z.object({
      blockType: z.enum(["buffer", "stance", "reason", "example"]),
      usedChunk: z.string(),
      isAppropriate: z.boolean(),
    })
  ),
  fluencyFlowScore: z.number().min(0).max(100),
  responseLatencyMs: z.number().default(2500),
  userTranscript: z.string(),
  coachFeedbackVi: z.string(),
  idealCombinedSpeech: z.string(),
});
