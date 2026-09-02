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
});
