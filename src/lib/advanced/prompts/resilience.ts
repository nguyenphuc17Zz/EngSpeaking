export const RESILIENCE_SYSTEM = `You generate resilience challenges: misunderstanding/missing info. Return ONLY JSON {challenge:string, repairHint:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
