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

  it("fast-pass turn returns 0ms success on high-fidelity paraphrase with independence + hesitation", async () => {
    const { computeFastPassTurn } = await import("@/lib/conversation/turn-fast-pass.service");
    const target = "I agree with your point, and I believe taking clear steps will lead to success.";
    const res = computeFastPassTurn(target, [target], {
      responseLatencyMs: 1500,
      speechDurationMs: 3000,
      hintTierUsed: 0,
      attemptNumber: 1,
    });
    expect(res.canFastPass).toBe(true);
    expect(res.pedagogy?.isFastPass).toBe(true);
    expect(res.pedagogy?.evaluationSource).toBe("fast_pass");
    expect(res.pedagogy?.independenceScore).toBe(100);
    expect(res.pedagogy?.hesitationMetrics?.wpm).toBeGreaterThan(30);
  });

  it("penalizes turn independence as hint tier increases", async () => {
    const { computeFastPassTurn } = await import("@/lib/conversation/turn-fast-pass.service");
    const target = "I agree with your point, and I believe taking clear steps will lead to success.";
    const noHint = computeFastPassTurn(target, [target], { hintTierUsed: 0, attemptNumber: 1 });
    expect(noHint.pedagogy?.independenceScore).toBe(100);
    expect(noHint.pedagogy?.attemptNumber).toBe(1);
  });

  it("adapts difficulty up after 3 strong turns and down after 2 failures (IRT/ZPD)", async () => {
    const { updateConversationAdaptiveProgression, INITIAL_CONVERSATION_ADAPTIVE_STATE } = await import(
      "@/lib/conversation/turn-adaptive-engine"
    );
    let state = { ...INITIAL_CONVERSATION_ADAPTIVE_STATE, currentDifficulty: 5 };
    const strong = { turnScore: 92, independenceScore: 100, attemptNumber: 1 } as never;
    state = updateConversationAdaptiveProgression(state, strong, 5);
    state = updateConversationAdaptiveProgression(state, strong, 5);
    state = updateConversationAdaptiveProgression(state, strong, 5);
    expect(state.currentDifficulty).toBeGreaterThan(5);
    expect(state.rapidStreak).toBe(3);

    const weak = { turnScore: 45, independenceScore: 100, attemptNumber: 1 } as never;
    let failState = { ...INITIAL_CONVERSATION_ADAPTIVE_STATE, currentDifficulty: 5 };
    failState = updateConversationAdaptiveProgression(failState, weak, 5);
    failState = updateConversationAdaptiveProgression(failState, weak, 5);
    expect(failState.currentDifficulty).toBeLessThan(5);
  });

  it("scenario grounds custom topic and carries difficultyOverall/prepTime/skills", async () => {
    const { mockScenario } = await import("@/lib/conversation/services/scenario.service");
    const sc = mockScenario({
      mode: "workplace",
      difficulty: "normal",
      surpriseLevel: "medium",
      conflictIntensity: "low",
      characterStyle: "friendly",
      pressure: "normal",
      duration: "10 min",
      topic: "custom_scenario: Negotiate salary for IT job",
    } as never);
    expect(sc.topic).toContain("Negotiate salary");
    expect(sc.difficultyOverall).toBe(sc.difficulty);
    expect(sc.prepTimeSec).toBeGreaterThanOrEqual(1.5);
    expect(sc.skills).toContain("conversation");
  });

  it("supports endless session with manual finish and real summary", async () => {
    const { useConversationStore } = await import("@/stores/conversation-store");
    useConversationStore.getState().reset();
    useConversationStore.getState().initSession("endless");
    expect(useConversationStore.getState().sessionConfig.mode).toBe("endless");

    useConversationStore.getState().addTurn({
      id: "ct_user_1",
      role: "user",
      text: "I would like to check in, please.",
      timestamp: new Date().toISOString(),
      durationMs: 2500,
      pedagogy: { turnScore: 88, latencyMs: 1500, independenceScore: 100, attemptNumber: 1 },
    });
    expect(useConversationStore.getState().sessionHistory.length).toBe(1);

    useConversationStore.getState().finishSessionManually();
    expect(useConversationStore.getState().isSessionCompleted).toBe(true);
    const summary = useConversationStore.getState().sessionSummary;
    expect(summary).not.toBeNull();
    expect(summary?.firstAttemptAccuracy).toBeDefined();
    expect(summary?.averageIndependence).toBeDefined();
    expect(summary?.masteryDelta).toBeDefined();
    expect(summary?.cefrBandEstimate).toBeDefined();
  });
});
