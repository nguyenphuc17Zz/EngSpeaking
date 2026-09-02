// Exercise generator prompt — single responsibility §53
import type { FoundationSkill, FoundationExerciseType } from "@/types/foundation";

export const EXERCISE_GENERATOR_SYSTEM = `You are an English speaking exercise generator for learners with strong passive knowledge but weak speaking automaticity.

STRICT RULES:
- Generate ONLY spoken English exercises, not quizzes.
- Keep instruction concise (1-2 sentences), clear, actionable, spoken output.
- Target skill exactly, realistic natural English, appropriate difficulty 1-10.
- Never include explanations, only instruction + prompt/target.
- Return ONLY valid JSON matching the requested schema, no markdown, no extra text.`;

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
  parts.push(`Generate ONE foundation exercise as JSON.`);
  parts.push(`Required fields: id, skill, type, level, difficulty, instruction, evaluationCriteria (array with dimension/weight/description).`);
  parts.push(`Optional: prompt, targetPhrase, targetPattern, constraints (array), expectedDurationSec, hintPolicy, topic, source="ai".`);
  if (opts.skill) parts.push(`Skill: ${opts.skill}`);
  if (opts.type) parts.push(`Type: ${opts.type}`);
  parts.push(`Difficulty: ${opts.difficulty} (1=easy,10=hard)`);
  parts.push(`Level: ${opts.level} (0=Listen → 10=Micro Monologue)`);
  if (opts.topic) parts.push(`Topic: ${opts.topic}`);
  if (opts.speechBank?.length) parts.push(`Speech bank context (use sparingly): ${opts.speechBank.slice(0,3).join(" | ")}`);
  if (opts.previousPerformance) parts.push(`Recent performance: ${opts.previousPerformance}`);

  parts.push(`Type meanings:`);
  parts.push(`- one_sentence: answer in ~1 sentence`);
  parts.push(`- answer_expansion: add where/when/why to basic sentence`);
  parts.push(`- substitution: change one element in sentence`);
  parts.push(`- chunk_practice: use chunk like "I think..." naturally`);
  parts.push(`- pattern_practice: imitate→modify pattern`);
  parts.push(`- repeat/shadow: listen then repeat/ shadow`);
  parts.push(`- timed_speaking/micro_monologue: speak continuously for duration`);
  parts.push(`- rapid_response: start within 3s`);
  parts.push(`- controlled_speaking: speak within constraints`);
  parts.push(`- translation_bridge: Vietnamese prompt → speak English`);
  parts.push(`- etc. Ensure difficulty matches constraints/length.`);

  parts.push(`Example valid JSON (do NOT copy, create new): {"id":"ex_123","skill":"sentence_retrieval","type":"one_sentence","level":4,"difficulty":5,"instruction":"Answer in one natural English sentence.","prompt":"What did you do yesterday?","evaluationCriteria":[{"dimension":"completion","weight":1,"description":"Answered in one sentence"}]}`);

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
