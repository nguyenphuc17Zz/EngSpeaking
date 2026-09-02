export const EVENT_SYSTEM = `You generate dynamic conversation events that fit setting/character, create meaningful speaking opportunity, and have consequence. No nonsense. Return ONLY valid JSON.`;

export function buildEventUserPrompt(opts: { worldStateJson: string; recentTurnsJson: string; surpriseLevel: string }): string {
  return `WorldState: ${opts.worldStateJson}\nRecent turns: ${opts.recentTurnsJson}\nSurpriseLevel: ${opts.surpriseLevel}\nGenerate ONE DynamicEvent JSON {id,type,effect,trigger?,probability?,priority?} where type in [interruption,misunderstanding,new_information,sudden_request,problem,change_of_plan,emotional_change,deadline,disagreement,unexpected_person,unexpected_question] that fits and changes objective. Return ONLY JSON.`;
}
