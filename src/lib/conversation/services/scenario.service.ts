import { generateTextWithRouting } from "@/lib/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";
import { scenarioBlueprintSchema } from "@/lib/validation/conversation-schemas";
import { SCENARIO_SYSTEM, buildScenarioUserPrompt } from "@/lib/conversation/prompts/scenario-generator";
import { sampleBankTask, saveBankTask, recordUserExposure } from "@/lib/foundation/services/content-bank.service";
import type { ScenarioBlueprint, ConversationSettings } from "@/types/conversation-world";
import { getFoundationProfile } from "@/lib/foundation/services/progress.service";

function difficultyStringToNumber(d: string | number | undefined, fallback = 5): number {
  if (typeof d === "number") return Math.max(1, Math.min(10, Math.round(d)));
  if (!d || d === "auto") {
    // Use foundation profile if available
    try {
      const p = getFoundationProfile();
      const overall = p.overallProduction || 50;
      return Math.max(2, Math.min(9, Math.round(overall / 10 + 1)));
    } catch { return fallback; }
  }
  const map: Record<string, number> = { easy: 3, normal: 5, hard: 7, extreme: 9 };
  return map[d] ?? fallback;
}

function mockScenario(settings: ConversationSettings): ScenarioBlueprint {
  const id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  const mode = settings.mode;
  const surprise = settings.surpriseLevel || "medium";
  const conflict = settings.conflictIntensity || "none";
  const presets: Record<string, Partial<ScenarioBlueprint>> = {
    free: { topic: "open conversation", setting: "casual chat", character: { role: "friendly conversation partner", personality: "warm, curious", communicationStyle: "casual, encouraging" }, userGoal: "Talk about anything you like", aiGoal: "Keep conversation flowing naturally", context: "You meet a friendly person for a casual chat" },
    casual: { topic: "weekend plans", setting: "coffee shop", character: { role: "friend at café", personality: "relaxed, humorous", communicationStyle: "casual, open-ended" }, userGoal: "Chat about your weekend", aiGoal: "Small talk and ask follow-ups", context: "You run into a friend at a café" },
    daily_life: { topic: "shopping help", setting: "supermarket aisle", character: { role: "store staff", personality: "helpful, patient", communicationStyle: "polite, clear" }, userGoal: "Ask where to find an item", aiGoal: "Help find items and suggest alternatives", context: "You need to buy something but can't find it" },
    travel: { topic: "hotel check-in", setting: "hotel lobby", character: { role: "receptionist", personality: "professional, busy", communicationStyle: "polite, concise" }, userGoal: "Check in and ask about facilities", aiGoal: "Handle check-in and answer questions", context: "You arrive after a long flight, room might not be ready", conflict: conflict !== "none" ? "Room not ready until 3pm" : undefined },
    workplace: { topic: "project update", setting: "office meeting room", character: { role: "manager", personality: "direct but supportive", communicationStyle: "professional, clear" }, userGoal: "Give a progress update", aiGoal: "Ask clarifying questions about deadlines", context: "Weekly team sync, you need to report progress" },
    professional: { topic: "negotiate deadline", setting: "client video call", character: { role: "client", personality: "skeptical, detail-oriented", communicationStyle: "formal, assertive" }, userGoal: "Negotiate a realistic deadline", aiGoal: "Push for earlier delivery while hearing constraints", context: "Client wants delivery sooner than planned, you need to negotiate" },
    interview: { topic: "tell me about yourself", setting: "interview room", character: { role: "interviewer", personality: "neutral, probing", communicationStyle: "professional, follow-up oriented" }, userGoal: "Answer interview questions", aiGoal: "Ask contextual follow-ups based on answers", context: "Job interview for a position you want" },
    debate: { topic: "remote work vs office", setting: "group discussion", character: { role: "debate partner", personality: "challenging but respectful", communicationStyle: "argumentative, evidence-seeking" }, userGoal: "Defend your position", aiGoal: "Challenge with counterexamples, not to win", context: "You disagree on work style, discuss pros/cons" },
    storytelling: { topic: "a memorable trip", setting: "story circle", character: { role: "listener", personality: "curious, encouraging", communicationStyle: "supportive, asks what happened next" }, userGoal: "Tell a story", aiGoal: "Ask follow-ups to continue narrative", context: "You share a personal story, listener wants details" },
    presentation: { topic: "my project", setting: "audience room", character: { role: "audience member", personality: "attentive, inquisitive", communicationStyle: "curious, clarification-seeking" }, userGoal: "Present your topic", aiGoal: "Ask audience questions", context: "You present for 1-2 minutes, audience will ask" },
    random: { topic: "surprise daily situation", setting: ["park bench","bookstore","airport gate","co-working space","restaurant"][Math.floor(Math.random()*5)], character: { role: "stranger", personality: "friendly, talkative", communicationStyle: "casual" }, userGoal: "Handle unexpected conversation", aiGoal: "Keep it natural and adapt", context: "Random encounter, you don't know what will happen" },
    ai_generated: { topic: settings.aiPrompt ? settings.aiPrompt.slice(0, 40) : "custom challenge", setting: "dynamic setting", character: { role: "adaptive partner", personality: "flexible, engaging", communicationStyle: "responsive" }, userGoal: settings.aiPrompt || "Handle the challenge", aiGoal: "Adapt to user request", context: settings.aiPrompt ? `User requested: ${settings.aiPrompt}` : "AI-generated challenge" },
    custom: { topic: settings.topic && settings.topic !== "auto" ? settings.topic : "custom topic", setting: settings.setting && settings.setting !== "auto" ? settings.setting : "custom setting", character: { role: settings.mode === "interview" ? "interviewer" : "conversation partner", personality: "adapted to style", communicationStyle: "matched to characterStyle" }, userGoal: "Complete the custom scenario", aiGoal: "Follow custom constraints", context: "Custom scenario per user controls" },
  };
  const base = presets[mode] || presets.free;
  const difficulty = typeof settings.difficulty === "string" ? difficultyStringToNumber(settings.difficulty) : (settings.difficulty as unknown as number) || 5;
  const eventsCount = surprise === "low" ? 0 : surprise === "medium" ? 1 : surprise === "high" ? 2 : 3;
  const events = Array.from({ length: eventsCount }, (_, i) => ({
    id: `ev_${i + 1}`,
    type: ["misunderstanding","new_information","change_of_plan","unexpected_question"][i % 4],
    effect: `Possible twist ${i + 1} for ${mode}`,
    probability: 0.3 + i * 0.1,
    priority: i + 1,
  }));
  return {
    id,
    mode: mode as ScenarioBlueprint["mode"],
    topic: base.topic || "general",
    setting: base.setting || "general setting",
    character: base.character as ScenarioBlueprint["character"],
    userGoal: base.userGoal || "Engage in conversation",
    aiGoal: base.aiGoal || "Respond naturally",
    difficulty,
    difficultyLabel: (typeof settings.difficulty === "string" ? settings.difficulty : "normal") as ScenarioBlueprint["difficultyLabel"],
    context: base.context || "General conversation",
    conflict: base.conflict,
    conflictIntensity: conflict as ScenarioBlueprint["conflictIntensity"],
    possibleEvents: events,
    speakingObjectives: [{ type: "general", description: "Speak naturally and respond" }],
    schemaVersion: 1,
  };
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    return null;
  }
}

function validateBlueprint(raw: unknown): ScenarioBlueprint | null {
  const parsed = scenarioBlueprintSchema.safeParse(raw);
  if (!parsed.success) return null;
  const v = parsed.data;
  // Guardrails §66
  if (!v.topic || !v.setting || !v.character.role || !v.userGoal) return null;
  if (v.difficulty < 1 || v.difficulty > 10) return null;
  if (v.possibleEvents && v.possibleEvents.length > 5) return null;
  return v as ScenarioBlueprint;
}

export async function generateScenario(
  settings: ConversationSettings,
  opts?: { provider?: string; model?: string; forceSource?: "bank" | "ai" | "auto" }
): Promise<ScenarioBlueprint> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return mockScenario(settings);

  const isCustomPrompt = Boolean(settings.aiPrompt && settings.aiPrompt.trim()) || settings.mode === "ai_generated";
  const numDifficulty = typeof settings.difficulty === "string" ? difficultyStringToNumber(settings.difficulty) : ((settings.difficulty as unknown as number) || 5);

  // 1. If not custom prompt, check Content Bank (Hybrid 70/30 Policy)
  if (!isCustomPrompt) {
    const bankSample = await sampleBankTask<ScenarioBlueprint>({
      module: "conversation_scenario",
      level: settings.mode,
      difficulty: numDifficulty,
      forceSource: opts?.forceSource,
    });

    if (bankSample) {
      recordUserExposure(bankSample.contentId, "conversation_scenario").catch(() => {});
      return bankSample.task;
    }
  }

  const prompt = buildScenarioUserPrompt({
    mode: settings.mode,
    difficulty: settings.difficulty as unknown as string,
    surpriseLevel: settings.surpriseLevel,
    conflictIntensity: settings.conflictIntensity,
    characterStyle: settings.characterStyle,
    pressure: settings.pressure,
    topic: settings.topic,
    setting: settings.setting,
    aiPrompt: settings.aiPrompt,
    duration: settings.duration,
  });

  const attemptOnce = async (): Promise<ScenarioBlueprint | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: prompt }],
          systemInstruction: SCENARIO_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 900,
        },
      });
      const json = extractJson(res.text);
      if (!json) return null;
      const withDefaults = json as Record<string, unknown>;
      if (!withDefaults.id) withDefaults.id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      if (!withDefaults.schemaVersion) withDefaults.schemaVersion = 1;
      return validateBlueprint(withDefaults);
    } catch { return null; }
  };

  let blueprint = await attemptOnce();
  if (!blueprint) blueprint = await attemptOnce();
  if (!blueprint) {
    // Try Bank fallback before static mock
    const fallbackBank = await sampleBankTask<ScenarioBlueprint>({
      module: "conversation_scenario",
      level: settings.mode,
      difficulty: numDifficulty,
      forceSource: "bank",
    });
    if (fallbackBank) {
      recordUserExposure(fallbackBank.contentId, "conversation_scenario").catch(() => {});
      return fallbackBank.task;
    }

    if (process.env.NODE_ENV !== "production") console.warn("[scenario] fallback mock");
    return mockScenario(settings);
  }

  // 2. Save newly generated blueprint into Content Bank
  saveBankTask({
    module: "conversation_scenario",
    category: blueprint.mode,
    level: blueprint.mode,
    difficulty: blueprint.difficulty,
    topic: blueprint.topic,
    payload: blueprint,
    hashSourceText: scenarioFingerprint(blueprint),
  })
    .then((record) => {
      recordUserExposure(record.id, "conversation_scenario").catch(() => {});
    })
    .catch(() => {});

  return blueprint;
}

export function scenarioFingerprint(s: ScenarioBlueprint): string {
  const raw = `${s.setting}|${s.character.role}|${s.topic}|${s.userGoal}|${s.conflict || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
  // Simple hash
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return `${h.toString(16)}_${raw.slice(0, 40)}`;
}

export { mockScenario };
