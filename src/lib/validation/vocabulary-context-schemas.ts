import { z } from "zod";

export const wordCollocationSchema = z.object({
  phrase: z.string(),
  meaningVi: z.string(),
  exampleSentence: z.string(),
});

export const contextSentenceItemSchema = z.object({
  id: z.string(),
  domain: z.enum(["workplace", "daily_life", "opinions", "academic"]),
  domainTitleVi: z.string(),
  sentenceEn: z.string(),
  sentenceVi: z.string(),
  targetWordHighlighted: z.string(),
  linkingSoundHints: z.string().optional(),
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
});
