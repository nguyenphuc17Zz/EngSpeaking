import { z } from "zod";

export const advancedTrainingTypeSchema = z.enum([
  "rapidResponse","pressureConversation","topicSwitching","unexpectedQuestion","deepFollowup","opinion","debate","persuasion","negotiation","storytelling","longForm","presentation","qaChallenge","interview","professional","clarification","resilience","ambiguity","escalation","reformulation","spontaneous","abstract","roleReversal","devilsAdvocate","highPressure"
]);

export const difficultyConfigSchema = z.object({
  responsePressure: z.number().min(0).max(10).optional(),
  topicNovelty: z.number().min(0).max(10).optional(),
  abstractness: z.number().min(0).max(10).optional(),
  conversationComplexity: z.number().min(0).max(10).optional(),
  characterDifficulty: z.number().min(0).max(10).optional(),
  numberOfConstraints: z.number().min(0).max(10).optional(),
  eventFrequency: z.number().min(0).max(10).optional(),
  supportLevel: z.number().min(0).max(10).optional(),
  level: z.string().optional(),
}).passthrough();

export const advancedTrainingContextSchema = z.object({
  targetSkills: z.array(z.string()).default([]),
  goal: z.string().optional(),
  difficulty: difficultyConfigSchema.optional(),
  durationMinutes: z.number().int().min(1).max(60),
  pressureLevel: z.string().optional(),
  topic: z.string().optional(),
  scenario: z.string().optional(),
  communicationObjective: z.string().optional(),
  userPreferences: z.record(z.string(), z.unknown()).optional(),
});

export const advancedTrainingBlockSchema = z.object({
  id: z.string().min(1),
  type: advancedTrainingTypeSchema,
  objective: z.string().min(1),
  skillTargets: z.array(z.string()),
  difficulty: difficultyConfigSchema,
  estimatedDurationMinutes: z.number().int().min(1).max(30),
  instructions: z.string().min(1),
  scenario: z.unknown().optional(),
  constraints: z.array(z.string()).optional(),
});

export const advancedChallengeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  trigger: z.string().min(1),
  purpose: z.string().min(1),
  effect: z.string().min(1),
});

export const advancedTrainingSessionSchema = z.object({
  id: z.string().min(1),
  modules: z.array(z.string()),
  blocks: z.array(advancedTrainingBlockSchema).min(1),
  challenges: z.array(advancedChallengeSchema),
  context: advancedTrainingContextSchema,
  createdAt: z.string().min(1),
  estimatedDurationMinutes: z.number().int().min(1).max(60),
  rationale: z.string().optional(),
});

export const advancedGenerationResultSchema = z.object({
  session: advancedTrainingSessionSchema,
  rationale: z.string().optional(),
});
