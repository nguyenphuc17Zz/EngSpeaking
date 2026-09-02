import { generateTextWithRouting } from "@/lib/ai";
import { conversationSummarySchema } from "@/lib/validation/conversation-schemas";
import { SUMMARY_SYSTEM, buildSummaryUserPrompt } from "@/lib/conversation/prompts/summary";
import type { ConversationSummary } from "@/types/conversation-world";

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
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

  const prompt = buildSummaryUserPrompt({ olderTurnsJson: JSON.stringify(olderTurns.slice(0, 20)), existingSummaryJson: opts?.existingSummaryJson });
  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: SUMMARY_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });
    const json = extractJson(res.text);
    if (!json) return mockSummary(olderTurns);
    const validated = conversationSummarySchema.safeParse(json);
    if (!validated.success) return mockSummary(olderTurns);
    return validated.data;
  } catch { return mockSummary(olderTurns); }
}
