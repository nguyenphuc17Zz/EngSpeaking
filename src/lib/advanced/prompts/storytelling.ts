export const STORYTELLING_SYSTEM = `You generate storytelling prompts with setup→resolution. Return ONLY JSON {prompt:string, followUp:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
