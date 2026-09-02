import { describe, it, expect } from "vitest";
import { generateSentenceBuilderTask } from "@/lib/foundation/sentence-builder/task-generator.service";
import { evaluateSentenceBuilderAttempt } from "@/lib/foundation/sentence-builder/evaluator.service";
import {
  AdaptiveState,
  updateAdaptiveProgression,
  updateSkillMastery,
  INITIAL_ADAPTIVE_STATE,
  INITIAL_SKILL_MASTERY,
} from "@/lib/foundation/sentence-builder/adaptive-engine";
import {
  recordErrorsFromEvaluation,
  getStoredErrors,
} from "@/lib/foundation/sentence-builder/error-bank.service";
import type { SentenceBuilderTask, SentenceBuilderEvaluation } from "@/types/sentence-builder";

describe("Sentence Builder (Function 1) Domain & Engine", () => {
  it("generates Level A, B, and C tasks dynamically with rich metadata", async () => {
    const taskA = await generateSentenceBuilderTask({ controlLevel: "controlled", provider: "mock" });
    expect(taskA.controlLevel).toBe("controlled");
    expect(taskA.scaffold.level).toBe(1);
    expect(taskA.hints.length).toBe(5);
    expect(taskA.prepTimeSec).toBeGreaterThanOrEqual(1.5);

    const taskB = await generateSentenceBuilderTask({ controlLevel: "semi_controlled", provider: "mock" });
    expect(taskB.controlLevel).toBe("semi_controlled");
    expect(taskB.scaffold.keywords).toBeDefined();

    const taskC = await generateSentenceBuilderTask({ controlLevel: "free", provider: "mock" });
    expect(taskC.controlLevel).toBe("free");
    expect(taskC.difficulty.overall).toBeGreaterThanOrEqual(5);
  });

  it("evaluates spoken attempts with communicative semantic priority", async () => {
    const mockTask: SentenceBuilderTask = {
      id: "task_test_1",
      taskType: "translation_output",
      controlLevel: "controlled",
      instruction: "Say in English",
      promptVi: "Hôm qua tôi đi tập gym sau giờ làm.",
      targetIntent: "Yesterday I went to the gym after work.",
      expectedResponses: [
        "Yesterday I went to the gym after work.",
        "I went to the gym after finishing work yesterday.",
      ],
      requiredElements: ["went to the gym", "after work", "yesterday"],
      scaffold: { level: 1, template: "Yesterday I ______ to the gym after work." },
      hints: [
        { tier: 0, title: "None", content: "", penaltyWeight: 0 },
        { tier: 1, title: "Keywords", content: "yesterday / gym", penaltyWeight: 0.1 },
        { tier: 2, title: "Pattern", content: "Yesterday I [went]...", penaltyWeight: 0.25 },
        { tier: 3, title: "Starter", content: "Yesterday I went...", penaltyWeight: 0.5 },
        { tier: 4, title: "Model", content: "Yesterday I went to the gym after work.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, lengthScore: 2 },
      skills: ["past_simple", "routine"],
      grammarTargets: ["past_simple"],
      vocabularyTargets: ["gym", "after work"],
      topic: "routine",
      prepTimeSec: 3.0,
    };

    // 1. Correct speech
    const evalPerfect = await evaluateSentenceBuilderAttempt({
      task: mockTask,
      userTranscript: "Yesterday I went to the gym after work.",
      latencyMs: 1800,
      speechDurationMs: 2500,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    expect(evalPerfect.overallScore).toBeGreaterThanOrEqual(75);
    expect(evalPerfect.meaningScore).toBeGreaterThanOrEqual(80);
    expect(evalPerfect.isSuccessful).toBe(true);
    expect(evalPerfect.independenceScore).toBe(100);

    // 2. Minor grammar slip: "go" instead of "went"
    const evalGrammarSlip = await evaluateSentenceBuilderAttempt({
      task: mockTask,
      userTranscript: "Yesterday I go to gym after work.",
      latencyMs: 2200,
      speechDurationMs: 2600,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    expect(evalGrammarSlip.isCommunicativelyValid).toBe(true);
    expect(evalGrammarSlip.errors.length).toBeGreaterThan(0);
    expect(evalGrammarSlip.betterVersion).toContain("gym");
  });

  it("adapts level and difficulty based on consecutive performance", () => {
    let state: AdaptiveState = { ...INITIAL_ADAPTIVE_STATE, currentLevel: "controlled", currentDifficulty: 3 };

    const strongEvaluation: SentenceBuilderEvaluation = {
      overallScore: 88,
      meaningScore: 90,
      grammarScore: 85,
      naturalnessScore: 85,
      fluencyScore: 80,
      retrievalScore: 85,
      independenceScore: 100,
      isCommunicativelyValid: true,
      isSuccessful: true,
      needsRetry: false,
      userTranscript: "I went to the gym yesterday.",
      cleanTranscript: "i went to the gym yesterday",
      latencyMs: 1600,
      speechDurationMs: 2200,
      errors: [],
      betterVersion: "I went to the gym yesterday.",
      praisePoints: ["Good job"],
      actionableFeedback: "Natural sentence",
      hintTierUsed: 0,
      attemptNumber: 1,
    };

    const dummyTask: SentenceBuilderTask = {
      id: "t1",
      taskType: "translation_output",
      controlLevel: "controlled",
      instruction: "Say",
      promptVi: "Hôm qua tôi đi tập gym.",
      targetIntent: "I went to the gym yesterday.",
      expectedResponses: ["I went to the gym yesterday."],
      requiredElements: ["went to the gym"],
      scaffold: { level: 1 },
      hints: [],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.3, lengthScore: 2 },
      skills: [],
      grammarTargets: [],
      vocabularyTargets: [],
      topic: "gym",
      prepTimeSec: 3.0,
    };

    // 1st success
    state = updateAdaptiveProgression(state, strongEvaluation, dummyTask);
    expect(state.consecutiveSuccesses).toBe(1);
    expect(state.currentLevel).toBe("controlled");

    // 2nd success
    state = updateAdaptiveProgression(state, strongEvaluation, dummyTask);
    expect(state.consecutiveSuccesses).toBe(2);

    // 3rd success -> transitions Level A to Level B (semi_controlled)
    state = updateAdaptiveProgression(state, strongEvaluation, dummyTask);
    expect(state.currentLevel).toBe("semi_controlled");
    expect(state.prepTimeSec).toBeLessThanOrEqual(3.0);
  });

  it("updates multi-dimensional skill mastery properly", () => {
    let mastery = { ...INITIAL_SKILL_MASTERY };
    const evalResult: SentenceBuilderEvaluation = {
      overallScore: 85,
      meaningScore: 90,
      grammarScore: 80,
      naturalnessScore: 80,
      fluencyScore: 75,
      retrievalScore: 90,
      independenceScore: 100,
      isCommunicativelyValid: true,
      isSuccessful: true,
      needsRetry: false,
      userTranscript: "Test transcript",
      cleanTranscript: "test transcript",
      latencyMs: 1500,
      speechDurationMs: 2000,
      errors: [],
      betterVersion: "Test transcript",
      praisePoints: [],
      actionableFeedback: "",
      hintTierUsed: 0,
      attemptNumber: 1,
    };

    mastery = updateSkillMastery(mastery, evalResult);
    expect(mastery.totalAttempts).toBe(1);
    expect(mastery.successfulFirstAttempts).toBe(1);
    expect(mastery.streakCount).toBe(1);
    expect(mastery.overallMastery).toBeGreaterThanOrEqual(50);
  });
});
