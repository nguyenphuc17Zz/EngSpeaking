export const DEBATE_SYSTEM = `You generate debate topics and positions. Be balanced, not always agree. Return ONLY JSON {topic:string, userPosition:string, aiPosition:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
