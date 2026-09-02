import { describe, it, expect } from "vitest";
import { generateVNToENTask } from "@/lib/foundation/vn-to-en/task-generator.service";
import { evaluateVNToENAttempt } from "@/lib/foundation/vn-to-en/evaluator.service";
import {
  updateVNAdaptiveState,
  INITIAL_VN_ADAPTIVE_STATE,
  VNAdaptiveState,
} from "@/lib/foundation/vn-to-en/adaptive-engine";
import type { VNToENTask, VNToENEvaluation } from "@/types/vn-to-en";

describe("Vietnamese -> English Speaking (Function 2) Engine", () => {
  it("generates Direct, Timed, and Rapid Fire tasks with rich metadata", async () => {
    const directTask = await generateVNToENTask({ retrievalMode: "direct", provider: "mock" });
    expect(directTask.retrievalMode).toBe("direct");
    expect(directTask.promptVi).toBeDefined();
    expect(directTask.expectedResponses.length).toBeGreaterThan(0);
    expect(directTask.hints.length).toBe(5);

    const timedTask = await generateVNToENTask({ retrievalMode: "timed", provider: "mock" });
    expect(timedTask.retrievalMode).toBe("timed");
    expect(timedTask.prepTimeSec).toBeLessThanOrEqual(2.5);

    const rapidTask = await generateVNToENTask({ retrievalMode: "rapid_fire", provider: "mock" });
    expect(rapidTask.retrievalMode).toBe("rapid_fire");
    expect(rapidTask.isRapidFire).toBe(true);
    expect(rapidTask.prepTimeSec).toBeLessThanOrEqual(1.0);
  });

  it("evaluates spoken attempts with semantic priority and alternative phrasing", async () => {
    const mockTask: VNToENTask = {
      id: "vn_test_1",
      category: "daily_life",
      retrievalMode: "direct",
      promptVi: "Tôi thường đi tập gym sau giờ làm việc.",
      targetIntent: "I usually go to the gym after work.",
      expectedResponses: [
        "I usually go to the gym after work.",
        "I normally work out after finishing work.",
        "I often hit the gym after work.",
      ],
      requiredMeaningElements: ["usually go to the gym", "after work"],
      targetSkills: ["present_simple", "spoken_retrieval"],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, semanticDensity: 2 },
      hints: [
        { tier: 0, title: "None", content: "", penaltyWeight: 0 },
        { tier: 1, title: "Keywords", content: "gym / work", penaltyWeight: 0.1 },
        { tier: 2, title: "Cue", content: "Present simple", penaltyWeight: 0.25 },
        { tier: 3, title: "Starter", content: "I usually...", penaltyWeight: 0.5 },
        { tier: 4, title: "Model", content: "I usually go to the gym after work.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 2.5,
      isRapidFire: false,
      topic: "daily_life",
    };

    // 1. Synonym variation: "I normally work out after work"
    const evalSynonym = await evaluateVNToENAttempt({
      task: mockTask,
      userTranscript: "I normally work out after work.",
      responseLatencyMs: 1500,
      speechDurationMs: 2200,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    expect(evalSynonym.meaningScore).toBe(100);
    expect(evalSynonym.isSuccessful).toBe(true);
    expect(evalSynonym.naturalAlternatives.length).toBeGreaterThan(0);

    // 2. Retrieval Gap detection when response is delayed >3.5s
    const evalDelayed = await evaluateVNToENAttempt({
      task: mockTask,
      userTranscript: "I usually go to the gym after work.",
      responseLatencyMs: 4200, // delayed
      speechDurationMs: 2500,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    expect(evalDelayed.gapType).toBe("retrieval_gap");
    expect(evalDelayed.meaningScore).toBe(100);
  });

  it("updates adaptive state and prep time pressure properly", () => {
    let state: VNAdaptiveState = { ...INITIAL_VN_ADAPTIVE_STATE, currentDifficulty: 3 };

    const strongEval: VNToENEvaluation = {
      overallScore: 92,
      meaningScore: 100,
      grammarScore: 90,
      naturalnessScore: 90,
      fluencyScore: 88,
      retrievalScore: 95,
      independenceScore: 100,
      isCommunicativelyValid: true,
      isSuccessful: true,
      needsRetry: false,
      isSayItBetterNeeded: false,
      gapType: "none",
      userTranscript: "I usually go to the gym after work.",
      cleanTranscript: "i usually go to the gym after work",
      responseLatencyMs: 1400,
      speechDurationMs: 2000,
      errors: [],
      betterVersion: "I usually go to the gym after work.",
      naturalAlternatives: [],
      praisePoints: ["Great job"],
      actionableFeedback: "Natural output",
      hintTierUsed: 0,
      attemptNumber: 1,
    };

    const dummyTask: VNToENTask = {
      id: "v1",
      category: "daily_life",
      retrievalMode: "timed",
      promptVi: "Test prompt",
      targetIntent: "Test intent",
      expectedResponses: ["Test response"],
      requiredMeaningElements: ["test"],
      targetSkills: [],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, semanticDensity: 2 },
      hints: [],
      prepTimeSec: 2.5,
      isRapidFire: false,
      topic: "test",
    };

    // 1st success
    state = updateVNAdaptiveState(state, strongEval, dummyTask);
    expect(state.consecutiveSuccesses).toBe(1);
    expect(state.rapidStreak).toBe(1);

    // 2nd success
    state = updateVNAdaptiveState(state, strongEval, dummyTask);
    expect(state.consecutiveSuccesses).toBe(2);

    // 3rd success -> increases difficulty
    state = updateVNAdaptiveState(state, strongEval, dummyTask);
    expect(state.consecutiveSuccesses).toBe(3);
    expect(state.currentDifficulty).toBe(4);
  });
});
