// Scenario generator prompt §52 — realism, variety, speaking opportunity, safe §67
export const SCENARIO_SYSTEM = `You are a scenario generator for English speaking practice. Generate coherent, realistic conversation worlds.

SAFETY: No dangerous/illegal, sexual, hateful, self-harm, or disallowed content. Keep general language-learning safe.

RULES:
- Return ONLY valid JSON matching schema, no markdown.
- Ensure user has meaningful speaking opportunities.
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
  const lines: string[] = [];
  lines.push(`Generate ONE ScenarioBlueprint JSON with fields: id, mode, topic, setting, character{name?,role,personality,communicationStyle}, userGoal, aiGoal, difficulty (1-10), context, conflict?, conflictIntensity?, possibleEvents (array of {id,type,effect,trigger?,probability?}), speakingObjectives (array {type,description,hidden?}), schemaVersion:1.`);
  lines.push(`Mode: ${opts.mode}`);
  lines.push(`Difficulty: ${opts.difficulty} (map easy=3,normal=5,hard=7,extreme=9,auto=5)`);
  lines.push(`SurpriseLevel: ${opts.surpriseLevel} (affects possibleEvents count: low=0-1,medium=1-2,high=2-3,extreme=3-4)`);
  lines.push(`ConflictIntensity: ${opts.conflictIntensity} (none/low/medium/high)`);
  lines.push(`CharacterStyle: ${opts.characterStyle}`);
  lines.push(`Pressure: ${opts.pressure}`);
  if (opts.topic && opts.topic !== "auto") lines.push(`Topic constraint: ${opts.topic} — ground setting/goal tightly in this topic situation (PRESET_TOPICS or custom_scenario)`);
  if (opts.setting && opts.setting !== "auto") lines.push(`Setting constraint: ${opts.setting}`);
  if (opts.aiPrompt) lines.push(`User AI request: "${opts.aiPrompt}" — interpret into full world`);
  if (opts.duration) lines.push(`Duration: ${opts.duration}`);
  if (opts.recentErrors?.length) lines.push(`Learner recurring errors to naturally elicit (do NOT lecture): ${opts.recentErrors.slice(0, 5).join(", ")}`);
  if (opts.pedagogicalConstraint) lines.push(opts.pedagogicalConstraint);
  lines.push(`Also set difficultyOverall=difficulty (1-10), prepTimeSec=2.5 default, skills=["spoken_retrieval","conversation"].`);
  lines.push(`Mode meanings: free=open chat, casual=small talk, daily_life=errands/shopping, travel=airport/hotel, workplace=meeting/deadline, professional=negotiate/persuade, interview=interviewer role, debate=counterarguments, storytelling=narrate, presentation=audience Q&A, random=surprise all auto, ai_generated=from aiPrompt.`);
  lines.push(`Optimize for conversational potential and realism. Avoid impossible context. Keep events coherent.`);
  lines.push(`Example (do NOT copy): {"id":"sc_123","mode":"travel","topic":"hotel check-in","setting":"hotel lobby","character":{"role":"receptionist","personality":"helpful but busy","communicationStyle":"polite, concise"},"userGoal":"Check in and ask about breakfast","aiGoal":"Greet guest and handle request","difficulty":5,"context":"You arrive at hotel after long flight","conflict":"room not ready","conflictIntensity":"low","possibleEvents":[{"id":"ev1","type":"misunderstanding","effect":"Room type confusion"}],"speakingObjectives":[{"type":"request","description":"Make polite request"}]}`);
  return lines.join("\n");
}
