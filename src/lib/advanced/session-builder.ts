import type { AdvancedTrainingContext, AdvancedTrainingSession } from "@/types/advanced";
import { generateMockSession } from "./mock/mock-session";
import { generateTextWithRouting } from "@/lib/ai";
import { advancedTrainingSessionSchema } from "@/lib/validation/advanced-schemas";

export async function buildAdvancedSession(context: AdvancedTrainingContext, opts?: { provider?: string; model?: string }): Promise<AdvancedTrainingSession> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  // AI decides composition if not mock
  if (provider === "mock") {
    const type = (context.targetSkills?.[0] || "spontaneous") as any;
    return generateMockSession(type, context);
  }
  // Try AI generation of full session
  try {
    const sys = `You compose advanced training session. Choose blocks warm-up→spontaneous→topicSwitching→pressure→roleplay→challenge→cooldown dynamically based on context. Return ONLY JSON matching AdvancedTrainingSession.`;
    const res = await generateTextWithRouting({
      provider, model,
      input: {
        messages: [{ role: "user", content: `Context: ${JSON.stringify(context).slice(0,1500)}` }],
        systemInstruction: sys,
        temperature: 0.6, maxOutputTokens: 900,
      },
    });
    const txt = res.text.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"");
    const json = JSON.parse(txt.match(/\{[\s\S]*\}/)?.[0] || txt);
    if (!json.id) json.id = `adv_${Date.now()}`;
    if (!json.createdAt) json.createdAt = new Date().toISOString();
    if (!json.context) json.context = context;
    const parsed = advancedTrainingSessionSchema.safeParse(json);
    if (parsed.success) return parsed.data;
  } catch {}
  // Fallback deterministic
  const type = (context.targetSkills?.[0] || "spontaneous") as any;
  return generateMockSession(type, context);
}
