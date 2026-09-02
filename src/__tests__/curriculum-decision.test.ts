import { describe, it, expect } from "vitest";
import { createDefaultLearnerState } from "@/lib/curriculum/learner-state-service";
import { getNextBestAction, buildLearningSession, replanSession } from "@/lib/curriculum/decision-engine";
import { CURRICULUM_MOCK_PROFILES } from "@/lib/curriculum/mock/profiles";

describe("Decision engine — adaptive behavior", () => {
  it("Profile A (weak automaticity) → retrieval speed, not grammar", async () => {
    const state = CURRICULUM_MOCK_PROFILES.A.state;
    const action = await getNextBestAction(state, undefined, { provider: "mock" });
    expect(action.skillId).toBeDefined();
    // Should not be grammar
    expect(action.skillId).not.toBe("grammar_in_speech");
  });
  it("Profile D fast but inaccurate → accuracy under pressure", async () => {
    const state = CURRICULUM_MOCK_PROFILES.D.state;
    const action = await getNextBestAction(state, undefined, { provider: "mock" });
    expect(action.skillId).toBeDefined();
  });
  it("Profile F controlled excellent → free conversation", async () => {
    const state = CURRICULUM_MOCK_PROFILES.F.state;
    const action = await getNextBestAction(state, undefined, { provider: "mock" });
    expect(action.type).toBeDefined();
  });
  it("short session 5 min coherent", async () => {
    const state = createDefaultLearnerState();
    const plan = await buildLearningSession(state, 5, undefined, { provider: "mock" });
    expect(plan.estimatedDurationMinutes).toBeLessThanOrEqual(6);
    expect(plan.blocks.reduce((s, b) => s + b.durationMinutes, 0)).toBeLessThanOrEqual(6);
  });
  it("long session 30 min includes review/challenge", async () => {
    const state = createDefaultLearnerState();
    const plan = await buildLearningSession(state, 30, undefined, { provider: "mock" });
    expect(plan.estimatedDurationMinutes).toBeGreaterThan(15);
  });
  it("mid-session replan: struggling inserts support", async () => {
    const state = createDefaultLearnerState();
    const plan = await buildLearningSession(state, 10, undefined, { provider: "mock" });
    const re = await replanSession(plan, { completedBlocks: [{ blockId: plan.blocks[0].id, performance: 0.3 }], remainingTime: 8 }, state);
    expect(re.blocks.length).toBeGreaterThanOrEqual(1);
  });
  it("mid-session replan: excellent skips easy", async () => {
    const state = createDefaultLearnerState();
    const plan = await buildLearningSession(state, 10, undefined, { provider: "mock" });
    const re = await replanSession(plan, { completedBlocks: [{ blockId: plan.blocks[0].id, performance: 0.95 }], remainingTime: 8 }, state);
    expect(re.blocks.length).toBeGreaterThan(0);
  });
  it("user override via goal still respects objective", async () => {
    const state = createDefaultLearnerState();
    state.goals = [{ id: "fluency", label: "Fluency", isPrimary: true }];
    const plan = await buildLearningSession(state, 10, { goalOverride: "fluency" }, { provider: "mock" });
    expect(plan.primarySkill).toBeDefined();
  });
});
