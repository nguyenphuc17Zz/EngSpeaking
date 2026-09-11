import { z } from "zod";

export const wordCollocationSchema = z.object({
  phrase: z.string(),
  meaningVi: z.string(),
  exampleSentence: z.string(),
  collocationType: z
    .enum(["verb_noun", "adj_noun", "phrasal_verb", "idiomatic", "discourse_marker"])
    .optional()
    .default("verb_noun"),
  pmiStrength: z.enum(["high", "native_chunk", "moderate"]).optional().default("high"),
});

export const contextSentenceItemSchema = z.object({
  id: z.string(),
  domain: z.enum(["workplace", "daily_life", "opinions", "academic", "casual_banter"]).default("daily_life"),
  domainTitleVi: z.string(),
  sentenceEn: z.string(),
  sentenceVi: z.string(),
  targetWordHighlighted: z.string(),
  linkingSoundHints: z.string().optional(),
  rhythmNoteVi: z.string().optional(),
});

export const spontaneousChallengeSchema = z.object({
  promptEn: z.string(),
  promptVi: z.string(),
  targetCollocation: z.string(),
  suggestedOpeningEn: z.string().optional(),
});

export const spokenWordItemSchema = z.object({
  id: z.string(),
  word: z.string(),
  ipaUS: z.string(),
  ipaUK: z.string().optional(),
  partOfSpeech: z.string().default("noun"),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("B1"),
  meaningVi: z.string(),
  englishDefinition: z.string(),
  stressedSyllableIndex: z.number().default(1),
  stressExplanationVi: z.string(),
  endingSoundGuideVi: z.string(),
  collocations: z.array(wordCollocationSchema).default([]),
  contextSentences: z.array(contextSentenceItemSchema).default([]),
  spontaneousChallenge: spontaneousChallengeSchema.optional(),
  wordMasteryScore: z.number().default(0),
  sentenceMasteryScore: z.number().default(0),
  isMastered: z.boolean().default(false),
  practiceCount: z.number().default(0),
});

export const wordPronunciationEvaluationSchema = z.object({
  isSuccessful: z.boolean(),
  wordSpokenCorrectly: z.boolean(),
  pronunciationScore: z.number().min(0).max(100),
  stressAccuracyScore: z.number().min(0).max(100),
  endingSoundScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  detectedPhonemes: z.string().optional(),
  userTranscript: z.string(),
  feedbackVi: z.string(),
  phonemeCorrectionAdvice: z.string(),
  syllablesDetected: z.array(z.string()).optional(),
  vietnameseL1TrapWarning: z.string().optional(),
  minimalPairAdvice: z.string().optional(),
  endingSoundStatus: z.enum(["clear", "weak", "missing", "distorted"]).optional(),
});

export const sentenceContextEvaluationSchema = z.object({
  isSuccessful: z.boolean(),
  sentenceClarityScore: z.number().min(0).max(100),
  linkingFluencyScore: z.number().min(0).max(100),
  intonationScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  userTranscript: z.string(),
  feedbackVi: z.string(),
  fluencyAdviceVi: z.string(),
  mode: z.enum(["guided", "spontaneous"]).optional(),
  targetWordUsed: z.boolean().optional(),
  collocationUsedNaturally: z.boolean().optional(),
  pviRhythmScore: z.number().min(0).max(100).optional(),
  suggestedAlternativeEn: z.string().optional(),
});
