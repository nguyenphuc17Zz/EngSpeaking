import { z } from "zod";

export const learningGoalSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isPrimary: z.boolean().optional(),
});

export const learningBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["warmup", "drill", "controlled_speaking", "conversation", "roleplay", "challenge", "review", "cooldown"]),
  skillId: z.string().optional(),
  exerciseType: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(30),
  difficulty: z.number().int().min(1).max(10),
  rationale: z.string().min(1),
});

export const learningSessionPlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  estimatedDurationMinutes: z.number().int().min(3).max(60),
  blocks: z.array(learningBlockSchema).min(1).max(8),
  primarySkill: z.string().optional(),
  secondarySkills: z.array(z.string()).optional(),
  expectedOutcome: z.string().min(1),
  planVersion: z.number().int(),
  generatedAt: z.string().min(1),
  generationReason: z.string().min(1),
  teacherVersion: z.string().min(1),
  schemaVersion: z.number().int(),
});

export const learnerStateSnapshotSchema = z.object({
  goals: z.array(z.string()),
  primaryBottleneck: z.string().optional(),
  secondaryBottlenecks: z.array(z.string()),
  topStrengths: z.array(z.string()),
  dimensions: z.record(z.string(), z.number()),
  skillPriorities: z.array(z.object({ skillId: z.string(), mastery: z.number(), trend: z.string() })),
  recentChanges: z.array(z.string()),
  reviewCandidates: z.array(z.string()),
  constraints: z.array(z.string()),
});

export const learningActionSchema = z.object({
  type: z.enum(["foundation_exercise", "conversation", "roleplay", "review", "challenge", "recovery", "assessment", "rest"]),
  skillId: z.string().optional(),
  reason: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  difficulty: z.number().int().min(1).max(10).optional(),
  durationMinutes: z.number().int().min(1).max(60).optional(),
  constraints: z.array(z.string()).optional(),
  sourceEvidence: z.array(z.string()).optional(),
});
