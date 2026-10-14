import { buildCreativeAngleDirective } from "@/lib/ai/prompts/diversity-engine";

export const CHALLENGE_SYSTEM = `You generate unexpected spoken pressure challenges. Return ONLY valid JSON:
{"type":"timePressure"|"unexpectedQuestion"|"disagreement"|"scenarioEscalation","trigger":string,"purpose":string,"effect":string}`;

export function buildPrompt(context: unknown): string {
  return `Context: ${JSON.stringify(context).slice(0, 600)}\n${buildCreativeAngleDirective()}`;
}
