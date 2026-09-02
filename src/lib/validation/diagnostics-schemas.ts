import { z } from "zod";

export const speakingDimensionsSchema = z.object({
  fluency: z.number().min(0).max(100),
  grammar: z.number().min(0).max(100),
  vocabulary: z.number().min(0).max(100),
  naturalness: z.number().min(0).max(100),
  responseSpeed: z.number().min(0).max(100),
  pronunciation: z.number().min(-1).max(100), // -1 for not_available
  communication: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
});

export const diagnosticEvidenceSchema = z.object({
  id: z.string().min(1),
  turnId: z.string().optional(),
  quote: z.string().optional(),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const diagnosticStrengthSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const diagnosticWeaknessSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  severity: z.number().min(0).max(100),
  frequency: z.number().min(0),
  impact: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  description: z.string().min(1),
  recurrenceKey: z.string().optional(),
});

export const grammarIssueSchema = z.object({
  id: z.string().min(1),
  span: z.string().optional(),
  category: z.string().min(1),
  severity: z.enum(["minor", "moderate", "major"]),
  explanation: z.string().min(1),
  correction: z.string().optional(),
  recurrenceKey: z.string().optional(),
  evidenceConfidence: z.number().min(0).max(1),
});

export const diagnosticPatternSchema = z.object({
  id: z.string().min(1),
  patternKey: z.string().min(1),
  description: z.string().min(1),
  frequency: z.number().min(0),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const bottleneckSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  priority: z.number().min(0).max(100),
  reason: z.string().min(1),
  severity: z.number().min(0).max(100),
  recurrence: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
});

export const recommendationSchema = z.object({
  skill: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  reason: z.string().min(1),
  evidenceIds: z.array(z.string()),
  suggestedExerciseTypes: z.array(z.string()),
  targetMetric: z.string().optional(),
});

export const turnEvaluationSchema = z.object({
  turnId: z.string().min(1),
  responseSpeed: z.number().min(0).max(100).optional(),
  fluency: z.number().min(0).max(100).optional(),
  grammar: z.number().min(0).max(100).optional(),
  vocabulary: z.number().min(0).max(100).optional(),
  naturalness: z.number().min(0).max(100).optional(),
  communication: z.number().min(0).max(100).optional(),
  confidenceIndicators: z.number().min(0).max(100).optional(),
  pronunciation: z.number().min(0).max(100).optional(),
  issues: z.array(z.object({ category: z.string(), severity: z.enum(["minor", "moderate", "major"]), evidence: z.string() })).default([]),
  isShortAnswer: z.boolean().optional(),
  fillerCount: z.number().optional(),
});

export const speakingEvaluationSchema = z.object({
  sessionId: z.string().min(1),
  sessionType: z.string().optional(),
  overallPracticeScore: z.number().min(0).max(100),
  dimensions: speakingDimensionsSchema,
  strengths: z.array(diagnosticStrengthSchema),
  weaknesses: z.array(diagnosticWeaknessSchema),
  recurringPatterns: z.array(diagnosticPatternSchema),
  priorityBottlenecks: z.array(bottleneckSchema),
  evidence: z.array(diagnosticEvidenceSchema),
  recommendations: z.array(recommendationSchema),
  confidence: z.object({ overall: z.enum(["low", "medium", "high"]), score: z.number().min(0).max(1), reason: z.string().optional() }),
  completeness: z.enum(["too_short", "partial", "sufficient", "rich"]),
  turnEvaluations: z.array(turnEvaluationSchema).optional(),
  grammarIssues: z.array(grammarIssueSchema).optional(),
  generatedAt: z.string().min(1),
  evaluatorVersion: z.string().min(1),
  schemaVersion: z.number().int(),
  promptVersion: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

export const diagnosticSnapshotSchema = z.object({
  topStrengths: z.array(z.string()),
  topWeaknesses: z.array(z.string()),
  primaryBottleneck: z.string().optional(),
  secondaryBottleneck: z.string().optional(),
  dimensions: speakingDimensionsSchema,
  recurringPatterns: z.array(z.string()),
  recommendedSkills: z.array(z.string()),
  evidenceConfidence: z.number().min(0).max(1),
  generatedAt: z.string().min(1),
});
