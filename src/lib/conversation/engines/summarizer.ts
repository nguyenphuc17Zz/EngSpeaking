import { generateTextWithRouting } from "@/lib/ai";
import { conversationSummarySchema } from "@/lib/validation/conversation-schemas";
import { SUMMARY_SYSTEM, buildSummaryUserPrompt } from "@/lib/conversation/prompts/summary";
import { cleanAiJson } from "@/lib/foundation/shared/json-parser";
import type { ConversationSummary } from "@/types/conversation-world";

function extractJson(text: string): unknown {
  const cleaned = cleanAiJson(text);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function mockSummary(olderTurns: Array<{ role: string; text: string }>): ConversationSummary {
  const summary = olderTurns.slice(0, 3).map((t) => `${t.role}: ${t.text.slice(0, 40)}`).join(" | ");
  return {
    summary: `Conversation so far: ${summary} ...`,
    keyFacts: [],
    activeThreads: [],
    resolvedThreads: [],
    characterState: { mood: "neutral", trust: 60, patience: 70, engagement: 65 },
  };
}

export async function summarizeConversation(
  olderTurns: Array<{ role: string; text: string }>,
  opts?: { existingSummaryJson?: string; provider?: string; model?: string }
): Promise<ConversationSummary> {
  if (!olderTurns.length) return mockSummary(olderTurns);
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return mockSummary(olderTurns);

  const compactTurns = olderTurns
    .slice(0, 20)
    .map((t) => `${t.role === "user" ? "U" : "A"}: ${t.text.slice(0, 140)}`)
    .join("\n");

  const prompt = buildSummaryUserPrompt({
    olderTurnsJson: compactTurns,
    existingSummaryJson: opts?.existingSummaryJson,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: SUMMARY_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 320,
      },
    });
    const json = extractJson(res.text) as Record<string, any> | null;
    if (!json || typeof json !== "object") return mockSummary(olderTurns);

    const now = new Date().toISOString();
    if (Array.isArray(json.keyFacts)) {
      json.keyFacts = json.keyFacts.map((f: any, idx: number) =>
        typeof f === "string"
          ? { id: `fact_${idx + 1}`, fact: f, createdAt: now }
          : { id: f?.id || `fact_${idx + 1}`, fact: f?.fact || "", createdAt: f?.createdAt || now }
      );
    }

    const validated = conversationSummarySchema.safeParse(json);
    if (!validated.success) return mockSummary(olderTurns);
    return validated.data;
  } catch {
    return mockSummary(olderTurns);
  }
}
