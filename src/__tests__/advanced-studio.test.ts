import { describe, it, expect } from "vitest";
import {
  INITIAL_ADVANCED_ADAPTIVE_STATE,
  updateAdvancedAdaptiveState,
  updateAdvancedMastery,
  INITIAL_ADVANCED_MASTERY,
  type AdvancedAdaptiveState,
} from "@/lib/advanced/adaptive-engine";
import { checkAdvancedPrerequisite } from "@/lib/advanced/prerequisite.service";
import { computeAdvancedFastPass, buildAdvancedFastPassEvaluation } from "@/lib/advanced/fast-pass.service";
import type { AdvancedTask, AdvancedEvaluation } from "@/types/advanced";

function mockTask(): AdvancedTask {
  return {
    id: "adv_test_1",
    track: "argument",
    level: "L2",
    skillTag: "debate",
    instruction: "Nêu quan điểm và bảo vệ lập trường:",
    promptVi: "Làm việc từ xa có làm giảm sáng tạo của kỹ sư không?",
    targetIntent: "Remote work does not reduce engineer creativity when rituals are strong.",
    expectedResponses: ["In my view, remote work does not reduce creativity because rituals keep ideas flowing."],
    requiredMeaningElements: ["remote work", "creativity", "rituals"],
    scaffold: { level: 2, template: null, keywords: ["remote", "creativity", "because"], starter: "In my view...", constraints: ["Use 'because'"] },
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
      { tier: 1, title: "Từ khoá", content: "remote creativity because", penaltyWeight: 0.1 },
      { tier: 2, title: "Khung", content: "In my view... because...", penaltyWeight: 0.25 },
      { tier: 3, title: "Mở đầu", content: "In my view, remote work...", penaltyWeight: 0.5 },
      { tier: 4, title: "Mẫu", content: "In my view, remote work does not reduce creativity because rituals keep ideas flowing.", penaltyWeight: 0.85 },
    ],
    difficulty: { overall: 5, grammarComplexity: 3, retrievalDemand: 0.6, semanticDensity: 3 },
    skills: ["debate"],
    grammarTargets: ["present_simple"],
    vocabularyTargets: ["remote", "creativity"],
    topic: "work",
    prepTimeSec: 2.0,
    blitzLimitSec: 6,
    requiredToulminElements: ["claim", "data", "warrant"],
    source: "seed",
  };
}

function mockEval(overrides: Partial<AdvancedEvaluation> = {}): AdvancedEvaluation {
  return {
    overallScore: 85,
    meaningScore: 90,
    grammarScore: 85,
    naturalnessScore: 82,
    fluencyScore: 85,
    retrievalScore: 88,
    independenceScore: 100,
    isCommunicativelyValid: true,
    isSuccessful: true,
    needsRetry: false,
    isSayItBetterNeeded: false,
    gapType: "none",
    userTranscript: "In my view, remote work does not reduce creativity because rituals keep ideas flowing.",
    cleanTranscript: "in my view remote work does not reduce creativity because rituals keep ideas flowing",
    responseLatencyMs: 1800,
    speechDurationMs: 4000,
    errors: [],
    betterVersion: "In my view, remote work does not reduce creativity because rituals keep ideas flowing.",
    naturalAlternatives: [],
    praisePoints: ["Tốt"],
    actionableFeedback: "Tiếp tục phát huy.",
    hintTierUsed: 0,
    attemptNumber: 1,
    ...overrides,
  };
}

describe("advanced adaptive engine", () => {
  it("levels up after 3 consecutive strong performances", () => {
    let state: AdvancedAdaptiveState = { ...INITIAL_ADVANCED_ADAPTIVE_STATE, currentLevel: "L1" };
    const task = mockTask();
    for (let i = 0; i < 3; i++) {
      state = updateAdvancedAdaptiveState(state, mockEval(), task);
    }
    expect(state.currentLevel).toBe("L2");
    expect(state.consecutiveSuccesses).toBe(3);
  });

  it("levels down after 2 consecutive failures", () => {
    let state: AdvancedAdaptiveState = { ...INITIAL_ADVANCED_ADAPTIVE_STATE, currentLevel: "L2" };
    const task = mockTask();
    for (let i = 0; i < 2; i++) {
      state = updateAdvancedAdaptiveState(state, mockEval({ overallScore: 45, independenceScore: 40, isSuccessful: false }), task);
    }
    expect(state.currentLevel).toBe("L1");
  });

  it("updates mastery per track with EMA", () => {
    const m = updateAdvancedMastery(INITIAL_ADVANCED_MASTERY, mockEval({ overallScore: 90 }), "argument");
    expect(m.argumentation).toBeGreaterThan(INITIAL_ADVANCED_MASTERY.argumentation);
    expect(m.reflex).toBe(INITIAL_ADVANCED_MASTERY.reflex);
    expect(m.totalAttempts).toBe(1);
  });
});

describe("advanced prerequisite gate", () => {
  it("recommends L1 when no foundation data", () => {
    const c = checkAdvancedPrerequisite("L2", {});
    expect(c.allowed).toBe(true);
    expect(c.recommendedLevel).toBe("L1");
  });

  it("recommends L3 for strong foundation", () => {
    const c = checkAdvancedPrerequisite("L3", { sbMastery: 75, vnIndependentRate: 65, vnAccuracy: 80 });
    expect(c.recommendedLevel).toBe("L3");
    expect(c.missing.length).toBe(0);
  });

  it("soft-allows L3 but lists missing when weak", () => {
    const c = checkAdvancedPrerequisite("L3", { sbMastery: 50, vnIndependentRate: 30, vnAccuracy: 55 });
    expect(c.allowed).toBe(true);
    expect(c.missing.length).toBeGreaterThan(0);
  });
});

describe("advanced fast-pass", () => {
  it("matches near-exact response with required elements", () => {
    const task = mockTask();
    const r = computeAdvancedFastPass(
      "In my view, remote work does not reduce creativity because rituals keep ideas flowing",
      task.expectedResponses,
      task.requiredMeaningElements
    );
    expect(r.isMatch).toBe(true);
  });

  it("rejects when required elements missing", () => {
    const task = mockTask();
    const r = computeAdvancedFastPass("Hello world", task.expectedResponses, task.requiredMeaningElements);
    expect(r.isMatch).toBe(false);
  });

  it("builds foundation-style evaluation with secondary toulmin", () => {
    const task = mockTask();
    const e = buildAdvancedFastPassEvaluation({
      task,
      userTranscript: task.expectedResponses[0],
      matchedResponse: task.expectedResponses[0],
      confidence: 0.97,
      responseLatencyMs: 1800,
      speechDurationMs: 4000,
    });
    expect(e.overallScore).toBeGreaterThanOrEqual(80);
    expect(e.independenceScore).toBe(100);
    expect(e.toulmin).toBeDefined();
    expect(e.composure).toBeDefined();
  });
});
