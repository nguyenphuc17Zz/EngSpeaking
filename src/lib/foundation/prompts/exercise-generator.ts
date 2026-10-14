// Exercise generator prompt — single responsibility §53
import type { FoundationSkill, FoundationExerciseType } from "@/types/foundation";
import { buildCreativeAngleDirective } from "@/lib/ai/prompts/diversity-engine";

export const EXERCISE_GENERATOR_SYSTEM = `You are an English speaking exercise generator for learners with strong passive knowledge but weak speaking automaticity.

STRICT RULES:
- Generate ONLY spoken English exercises, not quizzes.
- Keep instruction concise (1-2 sentences), clear, actionable, spoken output.
- Target skill exactly, realistic natural English, appropriate difficulty 1-10.
- Never include explanations, only instruction + prompt/target.
- Return ONLY valid JSON matching the requested schema, no markdown, no extra text.`;

const EXERCISE_TYPE_DESCRIPTIONS: Record<string, string> = {
  one_sentence: "answer in ~1 complete natural sentence",
  answer_expansion: "add where/when/why details to expand a basic answer",
  substitution: "change one key element in the sentence frame",
  chunk_practice: "use a natural conversational chunk in context",
  pattern_practice: "imitate and modify a spoken grammar pattern",
  repeat: "listen and repeat with natural rhythm",
  shadow: "shadow spoken utterance smoothly",
  timed_speaking: "speak continuously for the target duration",
  micro_monologue: "deliver a cohesive 30-45s mini-monologue",
  rapid_response: "start speaking within 3 seconds",
  controlled_speaking: "speak within specific lexical/grammar constraints",
  translation_bridge: "Vietnamese prompt -> speak natural English immediately",
};

export function buildExerciseUserPrompt(opts: {
  skill?: FoundationSkill;
  type?: FoundationExerciseType;
  difficulty: number;
  level: number;
  topic?: string;
  speechBank?: string[];
  previousPerformance?: string;
}): string {
  const parts: string[] = [];
  parts.push(`Generate ONE foundation exercise as JSON: {id, skill, type, level, difficulty, instruction, prompt, targetPhrase?, targetPattern?, constraints?, expectedDurationSec?, evaluationCriteria:[{dimension,weight,description}], topic, source:"ai"}.`);
  if (opts.skill) parts.push(`Skill: ${opts.skill}`);
  if (opts.type) {
    const desc = EXERCISE_TYPE_DESCRIPTIONS[opts.type] || "spoken practice";
    parts.push(`Type: ${opts.type} (${desc})`);
  }
  parts.push(`Difficulty: ${opts.difficulty}/10 | Level: ${opts.level}/10`);
  if (opts.topic) parts.push(`Topic: ${opts.topic}`);
  parts.push(buildCreativeAngleDirective());
  if (opts.speechBank?.length) parts.push(`Speech bank context (use sparingly): ${opts.speechBank.slice(0, 3).join(" | ")}`);
  if (opts.previousPerformance) parts.push(`Recent performance: ${opts.previousPerformance}`);

  return parts.join("\n");
}

// For AI structured output, we validate via Zod
export const EXERCISE_JSON_SCHEMA = {
  type: "object",
  required: ["id", "skill", "type", "level", "difficulty", "instruction", "evaluationCriteria"],
  properties: {
    id: { type: "string" },
    skill: { type: "string" },
    type: { type: "string" },
    level: { type: "integer" },
    difficulty: { type: "integer" },
    instruction: { type: "string" },
    prompt: { type: "string" },
    targetPhrase: { type: "string" },
    targetPattern: { type: "string" },
    constraints: { type: "array", items: { type: "object" } },
    expectedDurationSec: { type: "integer" },
    hintPolicy: { type: "object" },
    evaluationCriteria: { type: "array" },
    topic: { type: "string" },
    source: { type: "string" },
  },
} as const;
