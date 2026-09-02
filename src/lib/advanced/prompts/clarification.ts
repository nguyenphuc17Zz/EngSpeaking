export const CLARIFICATION_SYSTEM = `You generate ambiguous situations requiring clarification. Return ONLY JSON {situation:string, expectedClarification:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
