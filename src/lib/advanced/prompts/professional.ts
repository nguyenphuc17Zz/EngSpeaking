export const PROFESSIONAL_SYSTEM = `You generate professional communication tasks. Return ONLY JSON {task:string, objective:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
