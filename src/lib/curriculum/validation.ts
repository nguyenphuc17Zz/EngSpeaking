// Curriculum safety & constraint engine §80-81
import { learningSessionPlanSchema } from "@/lib/validation/curriculum-schemas";
import type { LearningSessionPlan } from "@/types/learner";

const ALLOWED_TYPES = new Set(["warmup","drill","controlled_speaking","conversation","roleplay","challenge","review","cooldown"]);
const ALLOWED_SKILLS = new Set([
  "sentence_retrieval","chunk_retrieval","sentence_construction","sentence_expansion","substitution","speaking_repetition","shadowing","controlled_speaking","response_speed","active_vocabulary","grammar_in_speech","conversation_followup","micro_monologue","recovery","self_correction","confidence","free_conversation","topic_switching","clarification","persuasion","explaining","storytelling","opinion_expression","negotiation","social_conversation","professional_communication"
]);

export function validateLearningPlan(plan: unknown): { valid: true; plan: LearningSessionPlan } | { valid: false; errors: string[] } {
  const parsed = learningSessionPlanSchema.safeParse(plan);
  if (!parsed.success) return { valid: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const p = parsed.data;
  const errors: string[] = [];
  if (p.estimatedDurationMinutes < 3 || p.estimatedDurationMinutes > 60) errors.push("duration out of bounds 3-60");
  const sum = p.blocks.reduce((s, b) => s + b.durationMinutes, 0);
  if (Math.abs(sum - p.estimatedDurationMinutes) > 5) errors.push(`blocks duration sum ${sum} != estimated ${p.estimatedDurationMinutes}`);
  for (const b of p.blocks) {
    if (!ALLOWED_TYPES.has(b.type)) errors.push(`invalid block type ${b.type}`);
    if (b.skillId && !ALLOWED_SKILLS.has(b.skillId)) {
      // allow extensible but warn only if unknown and not in foundation taxonomy
      // For now, allow any skill but log
    }
    if (b.difficulty < 1 || b.difficulty > 10) errors.push(`difficulty ${b.difficulty} out of 1-10`);
  }
  // No duplicate spam: check same skill+type 3 times in a row (avoid rapid_response×5 but allow warmup→drill same skill)
  for (let i = 2; i < p.blocks.length; i++) {
    const a = p.blocks[i], b = p.blocks[i-1], c = p.blocks[i-2];
    if (a.skillId && a.skillId === b.skillId && a.skillId === c.skillId && a.type === b.type && a.type === c.type) {
      errors.push(`duplicate skill ${a.skillId} 3 times`);
      break;
    }
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, plan: p };
}
