import { generateTextWithRouting } from "@/lib/ai";
import { conversationAIResponseSchema } from "@/lib/validation/conversation-schemas";
import { RESPONSE_SYSTEM, buildResponseUserPrompt } from "@/lib/conversation/prompts/response-generator";
import type { ConversationWorldState, ConversationAIResponse } from "@/types/conversation-world";

function mockResponse(state: ConversationWorldState, transcript: string): ConversationAIResponse {
  const mode = state.scenario.mode;
  const name = state.activeCharacter.name || state.scenario.character.role;
  const nextTopic = state.currentTopic;
  // Simple rule-based responses to avoid needing AI for mock
  const templates: Record<string, string[]> = {
    free: ["That's interesting! Could you tell me more about that?", "I see — how does that make you feel?", "What do you usually do in that situation?"],
    interview: ["Thanks for sharing. Could you give me a specific example?", "Interesting — what was the biggest challenge there?", "How did you handle that situation?"],
    travel: ["I understand. Let me check that for you — what else do you need?", "Got it! Is there anything else I can help with?", "Thanks for letting me know — how would you like to proceed?"],
    debate: ["That's a fair point, but what about the opposite perspective? Can you give evidence?", "Hmm, I'm not fully convinced — can you explain why you think so?", "Interesting take — what would you say to someone who disagrees?"],
  };
  const pool = templates[mode] || templates.free;
  const idx = Math.abs(transcript.length + state.turnCount) % pool.length;
  let text = pool[idx];
  // Personalize if user mentioned job/travel
  if (/work|job|company/i.test(transcript)) text = `You mentioned work — ${text.toLowerCase()}`;
  // Add character flavor
  if (state.activeCharacter.mood === "impatient") text = `I see. ${text}`;
  // Simulate event occasionally
  let event: ConversationAIResponse["event"] = undefined;
  if (state.scenario.possibleEvents.length > 0 && state.turnCount > 2 && Math.random() < 0.15) {
    const ev = state.scenario.possibleEvents[state.turnCount % state.scenario.possibleEvents.length];
    text += ` Also, something just happened: ${ev.effect}. How would you handle it?`;
    event = ev;
  }
  return {
    responseText: `${name ? `(${name}): ` : ""}${text}`,
    stateUpdate: {
      trustChange: transcript.trim().length > 10 ? 2 : -1,
      patienceChange: transcript.trim().length < 3 ? -5 : 0,
      newThreads: transcript.includes("?") ? [] : [],
    },
    event,
    pedagogy: {
      grammarIssue: null,
      grammarFix: null,
      nativeReformulation: transcript,
      turnScore: 85,
      coachTipVi: "Phản xạ giao tiếp tự nhiên!",
    },
    hints: {
      tier1Keywords: [
        { term: "From my perspective", meaning: "Theo góc nhìn của tôi" },
        { term: "In terms of", meaning: "Xét về mặt" },
      ],
      tier2Starters: [
        { starter: "I would say that...", meaning: "Tôi muốn nói rằng..." },
        { starter: "As far as I know...", meaning: "Theo như tôi biết..." },
      ],
      tier3FullAnswer: {
        en: "I agree with your point, and I believe taking clear steps will lead to success.",
        vi: "Tôi đồng ý với quan điểm của bạn và tin rằng từng bước rõ ràng sẽ dẫn tới thành công.",
      },
    },
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

function buildRecentTurnsJson(turns: Array<{ role: string; text: string }>, summaryJson?: string): string {
  // Keep last 15 turns (§69 choice 15 turns + facts/threads)
  const recent = turns.slice(-15);
  return JSON.stringify(recent);
}

export async function generateTurnResponse(
  state: ConversationWorldState,
  transcript: string,
  recentTurns: Array<{ role: string; text: string }>,
  opts?: { provider?: string; model?: string; summaryJson?: string; activeEventJson?: string }
): Promise<ConversationAIResponse> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return mockResponse(state, transcript);

  const worldStateJson = JSON.stringify({
    scenario: state.scenario,
    currentObjective: state.currentObjective,
    currentTopic: state.currentTopic,
    activeCharacter: state.activeCharacter,
    facts: state.conversationFacts.slice(-8),
    unresolvedThreads: state.unresolvedThreads.slice(-5),
    turnCount: state.turnCount,
    surpriseLevel: state.surpriseLevel,
    pressure: state.pressure,
  });

  const prompt = buildResponseUserPrompt({
    worldStateJson,
    recentTurnsJson: buildRecentTurnsJson(recentTurns, opts?.summaryJson),
    summaryJson: opts?.summaryJson,
    userTranscript: transcript,
    activeEventJson: opts?.activeEventJson,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: RESPONSE_SYSTEM,
        temperature: 0.75,
        maxOutputTokens: 400,
      },
    });
    const json = extractJson(res.text);
    if (!json) throw new Error("No JSON");
    const validated = conversationAIResponseSchema.safeParse(json);
    if (!validated.success) {
      // Fallback: treat raw text as responseText
      if (res.text.trim().length > 5) return { responseText: res.text.trim().slice(0, 600) };
      throw new Error("Schema invalid");
    }
    // Ensure stateUpdate has timestamps for facts
    if (validated.data.stateUpdate?.newFacts) {
      validated.data.stateUpdate.newFacts = validated.data.stateUpdate.newFacts.map((f) => ({ ...f, createdAt: f.createdAt || new Date().toISOString() }));
    }
    return validated.data;
  } catch {
    return mockResponse(state, transcript);
  }
}

export { mockResponse };
