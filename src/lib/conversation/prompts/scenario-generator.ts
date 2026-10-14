// Scenario generator prompt §52 — realism, variety, speaking opportunity, safe §67
import { buildCreativeAngleDirective } from "@/lib/ai/prompts/diversity-engine";

export const SCENARIO_SYSTEM = `You are a scenario generator for English speaking practice. Generate coherent, realistic, non-cliché conversation worlds.

SAFETY: No dangerous/illegal, sexual, hateful, self-harm, or disallowed content. Keep general language-learning safe.

RULES:
- Return ONLY valid JSON matching schema, no markdown.
- Ensure user has meaningful speaking opportunities with clear stakes.
- Difficulty 1-10 valid, no contradictions.
- Events must fit setting.
- Goal is speaking practice, not winning.`;

export function buildScenarioUserPrompt(opts: {
  mode: string;
  difficulty: string | number;
  surpriseLevel: string;
  conflictIntensity: string;
  characterStyle: string;
  pressure: string;
  topic?: string;
  setting?: string;
  aiPrompt?: string;
  duration?: string;
  recentErrors?: string[];
  pedagogicalConstraint?: string;
}): string {
  const creativeAngle = buildCreativeAngleDirective();
  const lines: string[] = [];
  lines.push(`Generate ONE ScenarioBlueprint JSON with fields: id, mode, topic, setting, character{name,role,personality,communicationStyle}, userGoal, aiGoal, difficulty (1-10), context, conflict?, conflictIntensity?, possibleEvents (array of {id,type,effect,trigger?,probability?}), speakingObjectives (array {type,description,hidden?}), difficultyOverall (1-10), prepTimeSec (2.5), skills:["spoken_retrieval","conversation"], schemaVersion:1.`);
  lines.push(`Mode: ${opts.mode} | Difficulty: ${opts.difficulty} | Surprise: ${opts.surpriseLevel} | Conflict: ${opts.conflictIntensity} | CharacterStyle: ${opts.characterStyle} | Pressure: ${opts.pressure}`);
  lines.push(creativeAngle);
  if (opts.topic && opts.topic !== "auto") lines.push(`Topic constraint: ${opts.topic} — ground setting/goal tightly in this topic situation`);
  if (opts.setting && opts.setting !== "auto") lines.push(`Setting constraint: ${opts.setting}`);
  if (opts.aiPrompt) lines.push(`User AI request: "${opts.aiPrompt}" — interpret into full world`);
  if (opts.duration) lines.push(`Duration: ${opts.duration}`);
  if (opts.recentErrors?.length) lines.push(`Learner recurring errors to naturally elicit (do NOT lecture): ${opts.recentErrors.slice(0, 5).join(", ")}`);
  if (opts.pedagogicalConstraint) lines.push(opts.pedagogicalConstraint);
  lines.push(`Strictly avoid generic hotel check-in or coffee ordering clichés unless explicitly requested.`);
  return lines.join("\n");
}

