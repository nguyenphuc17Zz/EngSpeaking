import { advancedTrainingSessionSchema } from "@/lib/validation/advanced-schemas";
import type { AdvancedTrainingSession } from "@/types/advanced";

export function validateAdvancedSession(session: unknown): { valid: true; session: AdvancedTrainingSession } | { valid: false; errors: string[] } {
  const parsed = advancedTrainingSessionSchema.safeParse(session);
  if (!parsed.success) return { valid: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const s = parsed.data as unknown as AdvancedTrainingSession;
  const errors: string[] = [];
  const sum = s.blocks.reduce((a, b) => a + b.estimatedDurationMinutes, 0);
  if (Math.abs(sum - s.estimatedDurationMinutes) > 5) errors.push(`blocks sum ${sum} != estimated ${s.estimatedDurationMinutes}`);
  if (s.blocks.length === 0) errors.push("no blocks");
  // Ensure no impossible combination: highPressure with low duration?
  if (errors.length) return { valid: false, errors };
  return { valid: true, session: s };
}
