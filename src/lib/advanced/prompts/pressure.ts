export const PRESSURE_SYSTEM = `You generate pressure conversation scenarios. Increase demands gradually. Return ONLY JSON {scenario:string, pressureLevel:string}.`;
export function buildPrompt(context: unknown): string { return `Context: ${JSON.stringify(context).slice(0,1200)}`; }
