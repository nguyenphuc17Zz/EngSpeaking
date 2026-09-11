import { describe, it, expect } from "vitest";
import { generateLatencyTask } from "@/lib/foundation/latency/task-generator.service";
import { evaluateLatencyAttempt } from "@/lib/foundation/latency/evaluator.service";
import {
  updateAdaptiveLatencyState,
  evaluateStaircaseStep,
  computeMedian,
  computePercentile,
  buildLatencySessionSummary,
  INITIAL_LATENCY_STATE,
  LatencyState,
} from "@/lib/foundation/latency/adaptive-latency-engine";
import {
  computeFastPassLatencyMatch,
  detectBufferChunk,
  COMMON_BUFFER_CHUNKS,
} from "@/lib/foundation/latency/fast-pass.service";
import type { LatencyTask, LatencyEvaluation } from "@/types/latency-training";

describe("Function 4 — Response Latency Training Engine", () => {
  it("generates speed tasks across all drill modes with buffer chunks and target latencies", async () => {
    const openTask = await generateLatencyTask({ drillMode: "open_response", provider: "mock" });
    expect(openTask.drillMode).toBe("open_response");
    expect(openTask.targetLatencyMs).toBeGreaterThanOrEqual(2500);
    expect(openTask.bufferChunks).toBeDefined();
    expect(openTask.bufferChunks?.length).toBe(3);

    const rapidTask = await generateLatencyTask({ drillMode: "rapid_retrieval", provider: "mock" });
    expect(rapidTask.drillMode).toBe("rapid_retrieval");
    expect(rapidTask.targetLatencyMs).toBeLessThanOrEqual(2000);

    const baselineTask = await generateLatencyTask({ drillMode: "baseline_test", provider: "mock" });
    expect(baselineTask.drillMode).toBe("baseline_test");
    expect(baselineTask.isBaseline).toBe(true);
  });

  it("classifies attempts into the 4-Quadrant Latency Matrix & detects fillers", async () => {
    const mockTask: LatencyTask = {
      id: "lat_test_1",
      drillMode: "open_response",
      promptText: "What do you usually do after work?",
      promptLanguage: "en",
      targetIntent: "Evening routine",
      expectedKeywords: ["relax", "gym", "music", "cook"],
      sampleResponses: ["I usually listen to music and cook dinner."],
      targetLatencyMs: 3000,
      difficulty: 3,
      category: "daily_conversation",
      bufferChunks: [
        { phrase: "Well, to be honest...", meaningVi: "Thành thật mà nói...", category: "buying_time" },
      ],
    };

    // 1. Fast + Correct (Quadrant 1)
    const evalFast = await evaluateLatencyAttempt({
      task: mockTask,
      userTranscript: "I usually listen to music and cook dinner.",
      responseLatencyMs: 1800, // < 3000
      speechDurationMs: 2500,
      speechOnsetMs: 1600,
      provider: "mock",
    });
    expect(evalFast.quadrant).toBe("fast_correct");
    expect(evalFast.isSuccessful).toBe(true);
    expect(evalFast.latencyStatus).toBe("excellent");
    expect(evalFast.speechOnsetMs).toBe(1600);

    // 2. Slow + Correct (Quadrant 2)
    const evalSlow = await evaluateLatencyAttempt({
      task: mockTask,
      userTranscript: "I usually listen to music and cook dinner.",
      responseLatencyMs: 4800, // > 3000
      speechDurationMs: 2500,
      provider: "mock",
    });
    expect(evalSlow.quadrant).toBe("slow_correct");
    expect(evalSlow.isSuccessful).toBe(true);
    expect(evalSlow.likelyCause).toBe("spoken_retrieval");

    // 3. Filler Detection
    const evalFiller = await evaluateLatencyAttempt({
      task: mockTask,
      userTranscript: "Um, I think, uh, I usually cook dinner.",
      responseLatencyMs: 2200,
      speechDurationMs: 3000,
      provider: "mock",
    });
    expect(evalFiller.hesitation.fillerCount).toBeGreaterThanOrEqual(2);
    expect(evalFiller.hesitation.fillersDetected).toContain("um");
  });

  it("calculates median, percentiles, and updates Psychometric Adaptive Staircase", () => {
    const latencies = [1500, 2200, 2800, 3100, 4500];
    expect(computeMedian(latencies)).toBe(2800);
    expect(computePercentile(latencies, 25)).toBeLessThan(2800);
    expect(computePercentile(latencies, 75)).toBeGreaterThan(2800);

    let state: LatencyState = { ...INITIAL_LATENCY_STATE, currentTargetLatencyMs: 3000 };

    const fastEval: LatencyEvaluation = {
      overallScore: 92,
      accuracyScore: 90,
      naturalnessScore: 90,
      fluencyScore: 90,
      responseLatencyMs: 1400,
      speechDurationMs: 2000,
      targetLatencyMs: 3000,
      latencyRatio: 0.46,
      quadrant: "fast_correct",
      latencyStatus: "excellent",
      likelyCause: "automatic",
      hesitation: { fillerCount: 0, fillersDetected: [], fillersPerMinute: 0, pauseCount: 0, selfCorrectionDetected: false },
      userTranscript: "I relax.",
      cleanTranscript: "i relax",
      isSuccessful: true,
      coachFeedbackVi: "Good",
      betterResponse: "I relax.",
      praisePoints: ["Fast"],
    };

    // Step 1: 1st fast response -> holds target
    state = updateAdaptiveLatencyState(state, fastEval);
    expect(state.rapidStreak).toBe(1);
    expect(state.currentTargetLatencyMs).toBe(3000);

    // Step 2: 2nd consecutive fast response -> tightens by 250ms
    state = updateAdaptiveLatencyState(state, fastEval);
    expect(state.rapidStreak).toBe(2);
    expect(state.currentTargetLatencyMs).toBe(2750);

    // Step 3: 3rd consecutive fast response -> tightens by another 250ms
    state = updateAdaptiveLatencyState(state, fastEval);
    expect(state.rapidStreak).toBe(3);
    expect(state.currentTargetLatencyMs).toBe(2500);

    // Step 4: Slow incorrect response -> relaxes by 200ms and triggers reversal
    const slowIncorrectEval: LatencyEvaluation = {
      ...fastEval,
      accuracyScore: 50,
      quadrant: "slow_incorrect",
      responseLatencyMs: 4000,
      latencyRatio: 1.6,
    };
    state = updateAdaptiveLatencyState(state, slowIncorrectEval);
    expect(state.currentTargetLatencyMs).toBe(2700);
    expect(state.reversalCount).toBeGreaterThanOrEqual(1);
  });

  it("detects Buffer Chunks and measures instant Fast-Pass latency matching", () => {
    const mockTask: LatencyTask = {
      id: "lat_fast_pass_1",
      drillMode: "open_response",
      promptText: "What do you think about remote working?",
      promptLanguage: "en",
      targetIntent: "Opinion on remote working",
      expectedKeywords: ["remote", "work", "flexible", "home"],
      sampleResponses: ["From my perspective, remote work is very flexible and convenient."],
      targetLatencyMs: 3000,
      difficulty: 4,
      category: "opinions",
      bufferChunks: [
        { phrase: "From my perspective...", meaningVi: "Theo góc nhìn của tôi...", category: "framing_opinion" },
        { phrase: "Well, to be honest...", meaningVi: "Thành thật mà nói...", category: "buying_time" },
      ],
    };

    // Test buffer detection directly
    const bufferMatch = detectBufferChunk(
      "From my perspective, remote work provides great flexibility.",
      mockTask.bufferChunks
    );
    expect(bufferMatch.bufferUsed).toBe("From my perspective");
    expect(bufferMatch.bufferCategory).toBe("framing_opinion");

    // Test Fast-Pass evaluation (<30ms)
    const tStart = performance.now();
    const result = computeFastPassLatencyMatch(
      mockTask,
      "From my perspective, remote work is very flexible and convenient.",
      {
        responseLatencyMs: 1600,
        speechDurationMs: 2500,
        speechOnsetMs: 1200,
      }
    );
    const duration = performance.now() - tStart;

    expect(duration).toBeLessThan(30); // Must be sub-30ms!
    expect(result.canFastPass).toBe(true);
    expect(result.evaluation.isFastPass).toBe(true);
    expect(result.evaluation.quadrant).toBe("fast_correct");
    expect(result.evaluation.bufferUsed).toBe("From my perspective");
    expect(result.evaluation.speechOnsetMs).toBe(1200);
    expect(result.evaluation.accuracyScore).toBeGreaterThanOrEqual(70);
  });

  it("generates comprehensive session summary with baseline delta", () => {
    const mockTask: LatencyTask = {
      id: "t1",
      drillMode: "open_response",
      promptText: "Q1",
      promptLanguage: "en",
      targetIntent: "A1",
      expectedKeywords: [],
      sampleResponses: [],
      targetLatencyMs: 3000,
      difficulty: 3,
      category: "daily_conversation",
    };

    const mockEval: LatencyEvaluation = {
      overallScore: 90,
      accuracyScore: 90,
      naturalnessScore: 85,
      fluencyScore: 90,
      responseLatencyMs: 2100,
      speechDurationMs: 2500,
      targetLatencyMs: 3000,
      latencyRatio: 0.7,
      quadrant: "fast_correct",
      latencyStatus: "strong",
      likelyCause: "automatic",
      hesitation: { fillerCount: 0, fillersDetected: [], fillersPerMinute: 0, pauseCount: 0, selfCorrectionDetected: false },
      userTranscript: "Answer",
      cleanTranscript: "answer",
      isSuccessful: true,
      coachFeedbackVi: "Good",
      betterResponse: "Answer",
      praisePoints: [],
    };

    const summary = buildLatencySessionSummary(
      "sess_1",
      "open_response",
      new Date().toISOString(),
      [
        { task: mockTask, evaluation: mockEval },
        { task: mockTask, evaluation: { ...mockEval, responseLatencyMs: 2900 } },
      ],
      4000 // Baseline was 4.0s
    );

    expect(summary.totalPrompts).toBe(2);
    expect(summary.medianLatencyMs).toBe(2500);
    expect(summary.baselineComparisonDeltaMs).toBe(-1500); // 1.5s faster than baseline
    expect(summary.quadrantDistribution.fastCorrectCount).toBe(2);
  });

  it("includes 4-tier hints and suggested vocabulary in generated tasks", async () => {
    const task = await generateLatencyTask({ drillMode: "open_response", provider: "mock" });
    expect(task.hints).toBeDefined();
    expect(task.hints?.length).toBe(5);
    expect(task.suggestedVocabulary).toBeDefined();
    expect(task.suggestedVocabulary?.length).toBeGreaterThan(0);
    expect(task.bufferChunks).toBeDefined();
    expect(task.bufferChunks?.length).toBe(3);
  });
});
