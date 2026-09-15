import { describe, it, expect } from "vitest";
import {
  generateCircumlocutionTask,
  generateSurvivalScenarioTask,
  SEED_CIRCUMLOCUTION_TASKS,
  SEED_SURVIVAL_SCENARIOS,
} from "@/lib/foundation/survival/survival-generator.service";
import {
  evaluateCircumlocutionAttempt,
  evaluateSurvivalScenarioAttempt,
} from "@/lib/foundation/survival/survival-evaluator.service";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
} from "@/types/survival-speaking";

describe("Function 7 — Survival Speaking & Circumlocution Engine", () => {
  it("generates Circumlocution tasks with forbidden words and 4-tier hint ladder", async () => {
    const task = await generateCircumlocutionTask({ provider: "mock" });

    expect(task.targetWord).toBeDefined();
    expect(task.forbiddenWords.length).toBeGreaterThan(0);
    expect(task.hints.functionHint).toBeDefined();
    expect(task.hints.starterHint).toBeDefined();
    expect(task.timeLimitSeconds).toBe(5);
  });

  it("generates Real-Life Survival Scenario tasks", async () => {
    const task = await generateSurvivalScenarioTask({ provider: "mock" });

    expect(task.context).toBeDefined();
    expect(task.problemDescriptionVi).toBeDefined();
    expect(task.audioPromptText).toBeDefined();
    expect(task.suggestedRepairPhrases.length).toBeGreaterThan(0);
  });

  it("evaluates Circumlocution attempt: success when target word is avoided and concept is clear", async () => {
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0]; // microwave

    const res = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's an electrical box in the kitchen that you use to warm up your food very quickly.",
      responseLatencyMs: 1800,
      provider: "mock",
    });

    expect(res.isSuccessful).toBe(true);
    expect(res.targetWordAvoided).toBe(true);
    expect(res.conceptClarityScore).toBeGreaterThanOrEqual(80);
    expect(res.repairInitiationLatencyMs).toBe(1800);
  });

  it("evaluates Circumlocution attempt: flags failure when forbidden target word is spoken", async () => {
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0]; // microwave

    const res = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "I use a microwave to cook my dinner.",
      responseLatencyMs: 1500,
      provider: "mock",
    });

    expect(res.targetWordAvoided).toBe(false);
    expect(res.isSuccessful).toBe(false);
  });

  it("evaluates Real-Life Survival Scenario attempt: validates recovery and strategy", async () => {
    const task: SurvivalScenarioTask = SEED_SURVIVAL_SCENARIOS[0]; // interview fast speech

    const res = await evaluateSurvivalScenarioAttempt({
      task,
      userTranscript: "Sorry, could you please say that again a little more slowly?",
      responseLatencyMs: 1600,
      provider: "mock",
    });

    expect(res.isSuccessful).toBe(true);
    expect(res.communicationRecovered).toBe(true);
    expect(res.overallScore).toBeGreaterThanOrEqual(80);
  });

  it("evaluates Aristotelian Genus, Differentia, and Listener Guessing test", async () => {
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0]; // microwave

    const res = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's a kind of kitchen appliance that you use to heat up cold food quickly.",
      responseLatencyMs: 1900,
      provider: "mock",
    });

    expect(res.isSuccessful).toBe(true);
    expect(res.targetWordAvoided).toBe(true);
    expect(res.genusDetected).toBe(true);
    expect(res.differentiaDetected).toBe(true);
    expect(res.listenerGuess).toBeDefined();
    expect(res.listenerGuess).toContain("MICROWAVE");
    expect(res.semanticPrecisionScore).toBeGreaterThanOrEqual(80);
  });

  it("detects morphological inflections of taboo lemmas (e.g. microwaved, microwaving)", async () => {
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0]; // microwave

    const res = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "I was microwaving my pizza yesterday in the kitchen.",
      responseLatencyMs: 1400,
      provider: "mock",
    });

    expect(res.targetWordAvoided).toBe(false);
    expect(res.isSuccessful).toBe(false);
    expect(res.listenerGuess).toContain("từ cấm");
  });

  it("generates tasks with SB/VN-EN aligned metadata (topic, difficultyOverall, prepTime, skills)", async () => {
    const circum = await generateCircumlocutionTask({
      provider: "mock",
      targetDifficulty: 7,
      topic: "technology",
      prepTimeSec: 2.0,
    });
    expect(circum.difficultyOverall).toBe(7);
    expect(circum.prepTimeSec).toBe(2.0);
    expect(circum.skills).toContain("circumlocution");
    expect(circum.source).toBe("seed");

    const scen = await generateSurvivalScenarioTask({
      provider: "mock",
      targetDifficulty: 3,
      topic: "travel",
    });
    expect(scen.difficultyOverall).toBe(3);
    expect(scen.prepTimeSec).toBeGreaterThanOrEqual(1.5);
    expect(scen.skills?.length).toBeGreaterThan(0);
  });

  it("fast-pass returns 0ms success on near-exact model match with independence + hesitation", async () => {
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0];
    const res = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
      responseLatencyMs: 1500,
      speechDurationMs: 2600,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    expect(res.evaluationSource).toBe("fast_pass");
    expect(res.isFastPass).toBe(true);
    expect(res.isSuccessful).toBe(true);
    expect(res.independenceScore).toBe(100);
    expect(res.hesitationMetrics).toBeDefined();
    expect(res.hesitationMetrics?.wpm).toBeGreaterThan(40);
    expect(res.retrievalScore).toBeGreaterThanOrEqual(70);
    expect(res.fluencyScore).toBeGreaterThanOrEqual(70);
  });

  it("penalizes independence score as hint tier increases", async () => {
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0];
    const noHint = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
      responseLatencyMs: 1500,
      speechDurationMs: 2600,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    // Force deterministic path with a paraphrase that won't fast-pass
    const heavyHint = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It is a box in kitchen for making food hot and warm for eating.",
      responseLatencyMs: 3200,
      speechDurationMs: 4200,
      hintTierUsed: 4,
      attemptNumber: 2,
      provider: "mock",
    });
    expect(noHint.independenceScore).toBe(100);
    expect(heavyHint.independenceScore).toBeLessThan(100);
    expect(heavyHint.hintTierUsed).toBe(4);
    expect(heavyHint.attemptNumber).toBe(2);
  });

  it("adapts difficulty up after 3 strong successes and down after 2 failures (IRT/ZPD)", async () => {
    const { updateSurvivalAdaptiveProgression, INITIAL_SURVIVAL_ADAPTIVE_STATE } = await import(
      "@/lib/foundation/survival/adaptive-engine"
    );
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0];
    let state = { ...INITIAL_SURVIVAL_ADAPTIVE_STATE, currentDifficulty: 4 };

    const strong = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
      responseLatencyMs: 1400,
      speechDurationMs: 2400,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    state = updateSurvivalAdaptiveProgression(state, strong, task);
    state = updateSurvivalAdaptiveProgression(state, strong, task);
    state = updateSurvivalAdaptiveProgression(state, strong, task);
    expect(state.currentDifficulty).toBeGreaterThan(4);
    expect(state.rapidStreak).toBe(3);

    const weak = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "I use a microwave to cook my dinner.",
      responseLatencyMs: 1500,
      speechDurationMs: 2000,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    let failState = { ...INITIAL_SURVIVAL_ADAPTIVE_STATE, currentDifficulty: 5 };
    failState = updateSurvivalAdaptiveProgression(failState, weak, task);
    failState = updateSurvivalAdaptiveProgression(failState, weak, task);
    expect(failState.currentDifficulty).toBeLessThan(5);
  });

  it("updates 5-D survival mastery with EMA and streak tracking", async () => {
    const { updateSurvivalMastery, INITIAL_SURVIVAL_MASTERY } = await import(
      "@/lib/foundation/survival/adaptive-engine"
    );
    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0];
    const evaluation = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
      responseLatencyMs: 1500,
      speechDurationMs: 2500,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    const mastery = updateSurvivalMastery(INITIAL_SURVIVAL_MASTERY, evaluation);
    expect(mastery.totalAttempts).toBe(1);
    expect(mastery.streakCount).toBe(1);
    expect(mastery.overallMastery).toBeGreaterThanOrEqual(40);
    expect(mastery.independence).toBeGreaterThanOrEqual(40);
  });

  it("supports endless session flow with manual finish and real summary", async () => {
    const { useSurvivalStore } = await import("@/stores/survival-store");
    await useSurvivalStore.getState().initSession("endless");
    expect(useSurvivalStore.getState().sessionConfig.mode).toBe("endless");

    const task: CircumlocutionTask = SEED_CIRCUMLOCUTION_TASKS[0];
    const evaluation = await evaluateCircumlocutionAttempt({
      task,
      userTranscript: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
      responseLatencyMs: 1500,
      speechDurationMs: 2500,
      hintTierUsed: 0,
      attemptNumber: 1,
      provider: "mock",
    });
    useSurvivalStore.getState().processEvaluation(evaluation);
    useSurvivalStore.getState().advanceToNextTask();
    expect(useSurvivalStore.getState().isSessionCompleted).toBe(false);

    useSurvivalStore.getState().finishSessionManually();
    expect(useSurvivalStore.getState().isSessionCompleted).toBe(true);
    const summary = useSurvivalStore.getState().sessionSummary;
    expect(summary).not.toBeNull();
    expect(summary?.firstAttemptAccuracy).toBeDefined();
    expect(summary?.averageIndependence).toBeDefined();
    expect(summary?.masteryDelta).toBeDefined();
    expect(summary?.topWeaknessIdentified).toBeDefined();
  });
});
