export const PRESENTATION_SYSTEM = `You generate presentation topics and audience Q&A. Return ONLY JSON {topic:string, audienceQuestions:[string]}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
