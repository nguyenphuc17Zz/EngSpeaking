export const SPONTANEOUS_SYSTEM = `You generate spontaneous speaking prompts. Be concise, 1 question, immediate. Return ONLY JSON {prompt:string, constraints:[string]}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
