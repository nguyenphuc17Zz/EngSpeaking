export const PERSUASION_SYSTEM = `You generate persuasion scenarios with goal/stake/objections. Return ONLY JSON {goal:string, character:string, objections:[string]}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
