export const NEGOTIATION_SYSTEM = `You generate negotiation with starting position, desired outcome, constraints, trade-offs. Return ONLY JSON {startingPosition:string, desiredOutcome:string, constraints:[string]}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
