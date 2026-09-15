import { describe, it, expect } from "vitest";
import { generateVNToENTask, cleanJson } from "@/lib/foundation/vn-to-en/task-generator.service";
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

  it("evaluates correct speech instantly (<100ms) with Fast-Pass Engine and returns Bo 3 Say It Better", async () => {
    const { computeFastPassVNMatch } = await import("@/lib/foundation/vn-to-en/fast-pass.service");

    const task: VNToENTask = {
      id: "vn_fp_1",
      category: "daily_life",
      retrievalMode: "timed",
      promptVi: "Tôi thường uống một tách cà phê vào buổi sáng trước khi bắt đầu làm việc.",
      targetIntent: "I usually drink a cup of coffee in the morning before starting work.",
      expectedResponses: [
        "I usually drink a cup of coffee in the morning before I start work.",
        "I normally have a cup of coffee in the morning before work.",
        "I usually grab a cup of coffee in the morning before starting work.",
      ],
      requiredMeaningElements: ["drink coffee", "in the morning", "before start work"],
      targetSkills: ["daily_routine", "spoken_retrieval"],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, semanticDensity: 2 },
      hints: [],
      prepTimeSec: 2.0,
      isRapidFire: false,
      topic: "routine",
      sayItBetter: {
        professional: "I typically drink a cup of coffee in the morning prior to commencing work.",
        casual: "I usually grab a cup of coffee in the morning before starting work.",
        idiomatic: "I always kick off my morning with a nice cup of joe before getting down to work.",
      },
    };

    // 1. Clear, correct utterance matching expected candidate
    const fpResult = computeFastPassVNMatch(task, "I usually drink a cup of coffee in the morning before I start work", {
      responseLatencyMs: 1200,
      speechDurationMs: 2000,
      hintTierUsed: 0,
      attemptNumber: 1,
    });

    expect(fpResult.canFastPass).toBe(true);
    expect(fpResult.evaluation).toBeDefined();
    expect(fpResult.evaluation?.isFastPass).toBe(true);
    expect(fpResult.evaluation?.meaningScore).toBeGreaterThanOrEqual(95);
    expect(fpResult.evaluation?.overallScore).toBeGreaterThanOrEqual(85);
    expect(fpResult.evaluation?.sayItBetter).toBeDefined();
    expect(fpResult.evaluation?.sayItBetter?.professional).toContain("prior to commencing");
    expect(fpResult.evaluation?.sayItBetter?.casual).toContain("grab a cup of coffee");
    expect(fpResult.evaluation?.sayItBetter?.idiomatic).toContain("cup of joe");

    // 2. Incomplete or inaccurate utterance -> Bypasses Fast-Pass, goes to full LLM evaluation
    const incompleteResult = computeFastPassVNMatch(task, "I drink water at night", {
      responseLatencyMs: 1200,
      speechDurationMs: 1500,
      hintTierUsed: 0,
      attemptNumber: 1,
    });

    expect(incompleteResult.canFastPass).toBe(false);
    expect(incompleteResult.evaluation).toBeUndefined();
  });

  describe("cleanJson Parser Resilience", () => {
    it("handles raw JSON properly", () => {
      const parsed = cleanJson('{"id": "test_1", "promptVi": "Xin chào"}') as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed?.id).toBe("test_1");
    });

    it("strips thinking/reasoning tags and markdown code fences", () => {
      const raw = `<think>
I need to produce a JSON object with promptVi and targetIntent.
</think>
Here is the JSON:
\`\`\`json
{
  "id": "test_think",
  "promptVi": "Tôi đang bận",
  "targetIntent": "I am busy"
}
\`\`\`
Hope this helps!`;
      const parsed = cleanJson(raw) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed?.id).toBe("test_think");
      expect(parsed?.promptVi).toBe("Tôi đang bận");
    });

    it("handles trailing commas in objects and arrays", () => {
      const raw = `{"id": "trailing", "items": ["a", "b",], "nested": {"key": "val",},}`;
      const parsed = cleanJson(raw) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed?.id).toBe("trailing");
    });

    it("recovers from truncated JSON when output tokens cut off closing braces", () => {
      const truncated = `{"id": "trunc_1", "category": "daily_life", "promptVi": "Cắt ngang", "hints": [{"tier": 0, "title": "Không"`;
      const parsed = cleanJson(truncated) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed?.id).toBe("trunc_1");
      expect(parsed?.promptVi).toBe("Cắt ngang");
    });
  });

  describe("Endless Mode & Topic Handling", () => {
    it("generates endless mode task with dynamic topic", async () => {
      const endlessTask = await generateVNToENTask({
        retrievalMode: "endless",
        topic: "travel",
        provider: "mock",
      });
      expect(endlessTask).toBeDefined();
      expect(endlessTask.retrievalMode).toBe("endless");
      expect(endlessTask.promptVi).toBeDefined();
      expect(endlessTask.targetIntent).toBeDefined();
      expect(endlessTask.sayItBetter).toBeDefined();
    });

    it("supports topic selection in vn-to-en store", async () => {
      const { useVNToENStore } = await import("@/stores/vn-to-en-store");
      const store = useVNToENStore.getState();

      store.setSelectedTopic("workplace", "");
      expect(useVNToENStore.getState().selectedTopicId).toBe("workplace");

      store.setSelectedTopic("custom", "Phỏng vấn xin việc bằng tiếng Anh");
      expect(useVNToENStore.getState().selectedTopicId).toBe("custom");
      expect(useVNToENStore.getState().customTopicText).toBe("Phỏng vấn xin việc bằng tiếng Anh");
    });
  });
});

