import type { AdvancedTrainingContext, AdvancedTrainingSession } from "@/types/advanced";
import { generateMockSession } from "./mock/mock-session";
import { generateTextWithRouting } from "@/lib/ai";
import { advancedTrainingSessionSchema } from "@/lib/validation/advanced-schemas";
import { cleanAiJson } from "@/lib/foundation/shared/json-parser";
import { buildCreativeAngleDirective } from "@/lib/ai/prompts/diversity-engine";

const SESSION_BUILDER_SYSTEM = `You compose an advanced spoken English training session.
Choose 2-4 progressive blocks using valid types: "rapidResponse" | "pressureConversation" | "topicSwitching" | "unexpectedQuestion" | "opinion" | "debate" | "persuasion" | "negotiation" | "spontaneous".
Return ONLY valid JSON:
{"blocks":[{"type":str,"objective":str,"skillTargets":[str],"estimatedDurationMinutes":num,"instructions":str,"timeLimitSec":num}],"challenges":[{"type":str,"trigger":str,"purpose":str,"effect":str}],"rationale":str}`;

export async function buildAdvancedSession(
  context: AdvancedTrainingContext,
  opts?: { provider?: string; model?: string }
): Promise<AdvancedTrainingSession> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  const resolveType = (): string => {
    const track = (context as unknown as Record<string, unknown>).track as string | undefined;
    if (track) {
      try {
        const { defaultSkillTagForTrack } = require("./track-map") as typeof import("./track-map");
        return defaultSkillTagForTrack(track as never);
      } catch {}
    }
    return context.targetSkills?.[0] || "spontaneous";
  };

  if (provider === "mock") {
    const type = resolveType() as any;
    return generateMockSession(type, context);
  }

  try {
    const rawCtx = context as unknown as Record<string, unknown>;
    const compactCtx = {
      track: rawCtx.track,
      level: rawCtx.level,
      goal: context.goal,
      topic: context.topic,
      durationMinutes: context.durationMinutes,
      targetSkills: context.targetSkills,
    };
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: `Context: ${JSON.stringify(compactCtx)}\n${buildCreativeAngleDirective()}` }],
        systemInstruction: SESSION_BUILDER_SYSTEM,
        temperature: 0.6,
        maxOutputTokens: 550,
      },
    });
    const cleaned = cleanAiJson(res.text);
    const json = cleaned ? (JSON.parse(cleaned) as Record<string, any>) : null;
    if (json && Array.isArray(json.blocks) && json.blocks.length > 0) {
      const now = new Date().toISOString();
      json.id = json.id || `adv_${Date.now()}`;
      json.createdAt = json.createdAt || now;
      json.context = context;
      json.estimatedDurationMinutes = json.estimatedDurationMinutes || context.durationMinutes || 15;
      json.blocks = json.blocks.map((b: any, i: number) => ({
        ...b,
        id: b.id || `blk_${i + 1}`,
        skillTargets: Array.isArray(b.skillTargets) ? b.skillTargets : context.targetSkills || ["spontaneous"],
        difficulty: b.difficulty || context.difficulty || { responsePressure: 6 },
        estimatedDurationMinutes: b.estimatedDurationMinutes || 5,
      }));
      json.modules = Array.isArray(json.modules) ? json.modules : json.blocks.map((b: any) => b.type);
      json.challenges = Array.isArray(json.challenges)
        ? json.challenges.map((c: any, i: number) => ({
            id: c.id || `ch_${i + 1}`,
            type: c.type || "timePressure",
            trigger: c.trigger || "turn 2",
            purpose: c.purpose || "Challenge composure",
            effect: c.effect || "Increase time pressure",
          }))
        : [];
      const parsed = advancedTrainingSessionSchema.safeParse(json);
      if (parsed.success) return parsed.data as unknown as AdvancedTrainingSession;
    }
  } catch {}

  const type = resolveType() as any;
  return generateMockSession(type, context);
}
