import type { AdvancedChallenge } from "@/types/advanced";
import { generateTextWithRouting } from "@/lib/ai";
import { CHALLENGE_SYSTEM, buildPrompt } from "./prompts/challenge";
import { cleanAiJson } from "@/lib/foundation/shared/json-parser";

function mockChallenge(trigger: string): AdvancedChallenge {
  const types = ["timePressure", "unexpectedQuestion", "disagreement", "scenarioEscalation"];
  const t = types[Math.floor(Math.random() * types.length)];
  return { id: `ch_${Date.now()}`, type: t, trigger, purpose: `Advanced challenge via ${t}`, effect: `Increase ${t} pressure` };
}

export async function triggerChallenge(context: unknown, provider: string, model: string): Promise<AdvancedChallenge> {
  if (provider === "mock") return mockChallenge("turn count");
  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: buildPrompt(context) }],
        systemInstruction: CHALLENGE_SYSTEM,
        temperature: 0.7,
        maxOutputTokens: 180,
      },
    });
    const cleaned = cleanAiJson(res.text);
    const json = cleaned ? JSON.parse(cleaned) : null;
    if (json?.type && json?.trigger) {
      return {
        id: `ch_${Date.now()}`,
        type: json.type,
        trigger: json.trigger,
        purpose: json.purpose || "challenge",
        effect: json.effect || "increase pressure",
      };
    }
  } catch {}
  return mockChallenge("fallback");
}
