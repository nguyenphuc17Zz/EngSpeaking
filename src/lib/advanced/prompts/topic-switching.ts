export const TOPIC_SWITCHING_SYSTEM = `You generate topic switches preserving realism. Types: related/semi-related/contrast/unexpected. Return ONLY JSON {newTopic:string, transition:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
