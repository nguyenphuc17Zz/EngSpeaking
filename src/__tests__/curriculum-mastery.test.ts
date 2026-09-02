import { describe, it, expect } from "vitest";
import { updateMastery, computeRetentionRisk, computeTrend, canPromote, shouldDemote, applyRecencyDecay } from "@/lib/curriculum/mastery";
import { getPrerequisites, arePrerequisitesSatisfied } from "@/lib/curriculum/skill-graph";
import { validateLearningPlan } from "@/lib/curriculum/validation";
import { createDefaultLearnerState } from "@/lib/curriculum/learner-state-service";

describe("Mastery update", () => {
  it("mastery moves toward performance", () => {
    const prev = { skillId: "response_speed", mastery: 0.5, confidence: 0.5, recentPerformance: 0.5, trend: "unknown" as const, practiceCount: 5, successfulAttempts: 2, failedAttempts: 1, currentDifficulty: 5 };
    const { mastery } = updateMastery(prev, 0.9, 0.8);
    expect(mastery).toBeGreaterThan(0.5);
  });
  it("confidence increases with evidence", () => {
    const prev = { skillId: "x", mastery: 0.5, confidence: 0.5, recentPerformance: 0.5, trend: "unknown" as const, practiceCount: 0, successfulAttempts: 0, failedAttempts: 0, currentDifficulty: 5 };
    const { confidence } = updateMastery(prev, 0.8, 0.9);
    expect(confidence).toBeGreaterThan(0.5);
  });
  it("retention risk high when not practiced", () => {
    const s = { skillId: "sentence_retrieval", mastery: 0.8, confidence: 0.7, recentPerformance: 0.8, trend: "stable" as const, practiceCount: 10, successfulAttempts: 8, failedAttempts: 1, currentDifficulty: 5, lastPracticedAt: new Date(Date.now() - 20 * 86400000).toISOString() };
    const risk = computeRetentionRisk(s);
    expect(risk).toBeGreaterThan(0.5);
  });
  it("trend detection", () => {
    expect(computeTrend([0.5, 0.6, 0.7])).toBe("improving");
    expect(computeTrend([0.7, 0.6, 0.5])).toBe("declining");
    expect(computeTrend([0.5, 0.51, 0.5])).toBe("stable");
  });
  it("promotion needs confidence and avg", () => {
    const skill = { skillId: "response_speed", mastery: 0.6, confidence: 0.7, recentPerformance: 0.8, trend: "improving" as const, practiceCount: 5, successfulAttempts: 3, failedAttempts: 0, currentDifficulty: 5 };
    expect(canPromote(skill, [0.8, 0.85, 0.9])).toBe(true);
    expect(canPromote({ ...skill, confidence: 0.4 }, [0.8, 0.85, 0.9])).toBe(false);
  });
  it("applies recency decay", () => {
    const s = { skillId: "x", mastery: 0.8, confidence: 0.7, recentPerformance: 0.8, trend: "stable" as const, practiceCount: 5, successfulAttempts: 3, failedAttempts: 0, currentDifficulty: 5, lastPracticedAt: new Date(Date.now() - 10 * 86400000).toISOString() };
    const decayed = applyRecencyDecay(s);
    expect(decayed.mastery).toBeLessThan(s.mastery);
  });
});

describe("Skill graph", () => {
  it("prerequisites", () => {
    expect(getPrerequisites("sentence_expansion")).toContain("sentence_construction");
    const map = new Map([["sentence_retrieval", 0.8], ["sentence_construction", 0.4]]);
    expect(arePrerequisitesSatisfied("sentence_expansion", map, 0.5)).toBe(false);
    map.set("sentence_construction", 0.6);
    expect(arePrerequisitesSatisfied("sentence_expansion", map, 0.5)).toBe(true);
  });
});

describe("Plan validation", () => {
  it("validates duration", () => {
    const plan = {
      id: "plan_1", title: "Test", objective: "obj", estimatedDurationMinutes: 10,
      blocks: [{ id: "b1", type: "warmup" as const, durationMinutes: 5, difficulty: 5, rationale: "r" }, { id: "b2", type: "drill" as const, durationMinutes: 5, difficulty: 5, rationale: "r" }],
      expectedOutcome: "out", planVersion: 1, generatedAt: new Date().toISOString(), generationReason: "test", teacherVersion: "5.0.0", schemaVersion: 1,
    };
    expect(validateLearningPlan(plan).valid).toBe(true);
    const bad = { ...plan, estimatedDurationMinutes: 100 };
    expect(validateLearningPlan(bad).valid).toBe(false);
  });
  it("prevents duplicate skill spam", () => {
    const plan = {
      id: "plan_1", title: "Test", objective: "obj", estimatedDurationMinutes: 9,
      blocks: [
        { id: "b1", type: "drill" as const, skillId: "response_speed", durationMinutes: 3, difficulty: 5, rationale: "r" },
        { id: "b2", type: "drill" as const, skillId: "response_speed", durationMinutes: 3, difficulty: 5, rationale: "r" },
        { id: "b3", type: "drill" as const, skillId: "response_speed", durationMinutes: 3, difficulty: 5, rationale: "r" },
      ],
      expectedOutcome: "out", planVersion: 1, generatedAt: new Date().toISOString(), generationReason: "test", teacherVersion: "5.0.0", schemaVersion: 1,
    };
    expect(validateLearningPlan(plan).valid).toBe(false);
  });
});
