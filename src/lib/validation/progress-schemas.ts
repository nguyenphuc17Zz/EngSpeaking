import { z } from "zod";

export const rangeSchema = z.enum(["7d", "30d", "90d", "all"]).default("30d");

export const progressOverviewQuerySchema = z.object({
  range: rangeSchema.optional(),
  learnerId: z.string().optional(),
});

export const skillHistoryQuerySchema = z.object({
  skillId: z.string().min(1),
  range: rangeSchema.optional(),
});

export const compareRequestSchema = z.object({
  baselineId: z.string().optional(),
  comparisonId: z.string().optional(),
  periodA: z.object({ start: z.string(), end: z.string() }).optional(),
  periodB: z.object({ start: z.string(), end: z.string() }).optional(),
});

export const reportRequestSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  start: z.string().optional(),
  end: z.string().optional(),
  learnerId: z.string().optional(),
});
