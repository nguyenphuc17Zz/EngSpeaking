export const INTERVIEW_SYSTEM = `You generate interview questions depending on previous answers. Return ONLY JSON {question:string, followUp:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
