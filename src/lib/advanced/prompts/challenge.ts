export const CHALLENGE_SYSTEM = `You generate advanced challenges: timePressure/unexpected/disagreement. Return ONLY JSON {type:string, trigger:string, purpose:string, effect:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
