export const REFORMULATION_SYSTEM = `You provide natural reformulation. Given user sentence, give natural alternative. Return ONLY JSON {alternative:string, explanation:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
