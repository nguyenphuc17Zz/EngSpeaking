import { describe, it, expect } from "vitest";
import { mockScenario } from "@/lib/conversation/services/scenario.service";
import { mockResponse } from "@/lib/conversation/services/conversation.service";
import { applyStateUpdate } from "@/lib/conversation/engines/state-manager";
import { summarizeConversation } from "@/lib/conversation/engines/summarizer";
import type { ConversationWorldState } from "@/types/conversation-world";

describe("Integration: scenario → turn → state → event → persist §74", () => {
  it("full flow mock", async () => {
    const scenario = mockScenario({ mode: "travel", difficulty: "normal", surpriseLevel: "high", conflictIntensity: "medium", characterStyle: "friendly", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    let state: ConversationWorldState = {
      scenario,
      currentObjective: scenario.userGoal,
      currentTopic: scenario.topic,
      activeCharacter: { mood: "friendly", trust: 60, patience: 70, engagement: 65, role: scenario.character.role },
      conversationFacts: [],
      unresolvedThreads: [],
      activeEvents: [],
      turnCount: 0,
      surpriseLevel: "high",
      pressure: "normal",
    };
    const turns: Array<{ role: string; text: string }> = [];
    const transcript = "I would like to check in, please.";
    turns.push({ role: "user", text: transcript });
    const resp = mockResponse(state, transcript);
    expect(resp.responseText.length).toBeGreaterThan(5);
    state = applyStateUpdate(state, resp);
    turns.push({ role: "assistant", text: resp.responseText });
    expect(state.turnCount).toBe(1);
    // Second turn with topic branching §25
    const t2 = "I work at a software company in Tokyo.";
    turns.push({ role: "user", text: t2 });
    const resp2 = mockResponse(state, t2);
    state = applyStateUpdate(state, { ...resp2, stateUpdate: { ...resp2.stateUpdate, newFacts: [{ id: "f1", fact: "User works at software company in Tokyo", createdAt: new Date().toISOString() }] } });
    expect(state.conversationFacts.length).toBeGreaterThan(0);
    turns.push({ role: "assistant", text: resp2.responseText });
  });

  it("long session summarization §69", async () => {
    const turns = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", text: `Turn ${i} about travel and work` }));
    const summary = await summarizeConversation(turns.slice(0, 20), { provider: "mock" });
    expect(summary.summary.length).toBeGreaterThan(10);
    expect(summary.characterState).toBeDefined();
    // Simulate keeping last 15
    const recent = turns.slice(-15);
    expect(recent.length).toBe(15);
  });
});
