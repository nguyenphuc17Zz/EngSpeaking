import { generateTextWithRouting } from "@/lib/ai";
import { dynamicEventSchema } from "@/lib/validation/conversation-schemas";
import { EVENT_SYSTEM, buildEventUserPrompt } from "@/lib/conversation/prompts/event-generator";
import type { ConversationWorldState, DynamicEvent } from "@/types/conversation-world";

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    return null;
  }
}

function shouldTriggerEvent(state: ConversationWorldState): boolean {
  // Consider surpriseLevel, turnCount, patience, unresolvedThreads
  const baseProb = state.surpriseLevel === "low" ? 0.08 : state.surpriseLevel === "medium" ? 0.15 : state.surpriseLevel === "high" ? 0.25 : 0.35;
  const tension = state.turnCount > 5 ? 0.05 : 0;
  const patienceFactor = state.activeCharacter.patience < 40 ? 0.1 : 0;
  const roll = Math.random();
  return roll < (baseProb + tension + patienceFactor);
}

export async function maybeGenerateEvent(
  state: ConversationWorldState,
  recentTurns: Array<{ role: string; text: string }>,
  opts?: { provider?: string; model?: string; force?: boolean }
): Promise<DynamicEvent | null> {
  if (!opts?.force && !shouldTriggerEvent(state)) return null;
  if (state.scenario.possibleEvents.length === 0) return null;

  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";

  // Mock: pick from possibleEvents
  if (provider === "mock") {
    const pool = state.scenario.possibleEvents;
    return pool[Math.floor(Math.random() * pool.length)] || null;
  }

  const prompt = buildEventUserPrompt({
    worldStateJson: JSON.stringify({ scenario: state.scenario, currentTopic: state.currentTopic, surpriseLevel: state.surpriseLevel }),
    recentTurnsJson: JSON.stringify(recentTurns.slice(-5)),
    surpriseLevel: state.surpriseLevel,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: EVENT_SYSTEM,
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    });
    const json = extractJson(res.text);
    if (!json) return null;
    const validated = dynamicEventSchema.safeParse(json);
    if (!validated.success) return null;
    return validated.data;
  } catch {
    return null;
  }
}
