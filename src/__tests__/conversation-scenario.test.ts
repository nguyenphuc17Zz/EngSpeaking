import { describe, it, expect } from "vitest";
import { scenarioBlueprintSchema, conversationWorldStateSchema, conversationAIResponseSchema, dynamicEventSchema } from "@/lib/validation/conversation-schemas";
import { mockScenario, scenarioFingerprint } from "@/lib/conversation/services/scenario.service";

describe("Scenario generation §66", () => {
  it("valid scenario schema", () => {
    const sc = mockScenario({ mode: "travel", difficulty: "normal", surpriseLevel: "medium", conflictIntensity: "low", characterStyle: "friendly", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    expect(scenarioBlueprintSchema.safeParse(sc).success).toBe(true);
  });
  it("rejects invalid difficulty", () => {
    const sc = mockScenario({ mode: "free", difficulty: "normal", surpriseLevel: "low", conflictIntensity: "none", characterStyle: "auto", pressure: "normal", duration: "5 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    const bad = { ...sc, difficulty: 15 };
    expect(scenarioBlueprintSchema.safeParse(bad).success).toBe(false);
  });
  it("fingerprint stable", () => {
    const s1 = mockScenario({ mode: "travel", difficulty: "normal", surpriseLevel: "low", conflictIntensity: "none", characterStyle: "friendly", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    const fp1 = scenarioFingerprint(s1);
    const fp2 = scenarioFingerprint({ ...s1 });
    expect(fp1).toBe(fp2);
    const s2 = { ...s1, setting: "different setting xyz" };
    expect(scenarioFingerprint(s2 as typeof s1)).not.toBe(fp1);
  });
});

describe("Character state", () => {
  it("initial trust/patience in range", () => {
    const sc = mockScenario({ mode: "casual", difficulty: "auto", surpriseLevel: "medium", conflictIntensity: "low", characterStyle: "friendly", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    expect(sc.character.role.length).toBeGreaterThan(2);
    expect(sc.difficulty).toBeGreaterThanOrEqual(1);
  });
});

describe("Conversation state §22", () => {
  it("world state validation", () => {
    const sc = mockScenario({ mode: "free", difficulty: "normal", surpriseLevel: "medium", conflictIntensity: "none", characterStyle: "auto", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    const world = {
      scenario: sc,
      currentObjective: sc.userGoal,
      currentTopic: sc.topic,
      activeCharacter: { mood: "friendly", trust: 60, patience: 70, engagement: 65, role: sc.character.role },
      conversationFacts: [],
      unresolvedThreads: [],
      activeEvents: [],
      turnCount: 0,
      surpriseLevel: "medium" as const,
      pressure: "normal" as const,
    };
    expect(conversationWorldStateSchema.safeParse(world).success).toBe(true);
  });
  it("fact update via state-manager", async () => {
    const { applyStateUpdate } = await import("@/lib/conversation/engines/state-manager");
    const sc = mockScenario({ mode: "free", difficulty: "normal", surpriseLevel: "medium", conflictIntensity: "none", characterStyle: "auto", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    const state = {
      scenario: sc,
      currentObjective: sc.userGoal,
      currentTopic: sc.topic,
      activeCharacter: { mood: "friendly", trust: 60, patience: 70, engagement: 65 },
      conversationFacts: [],
      unresolvedThreads: ["work"],
      activeEvents: [],
      turnCount: 1,
      surpriseLevel: "medium" as const,
      pressure: "normal" as const,
    };
    const next = applyStateUpdate(state as unknown as import("@/types/conversation-world").ConversationWorldState, {
      responseText: "Hello",
      stateUpdate: { newFacts: [{ id: "f1", fact: "User works at software company", createdAt: new Date().toISOString() }], newThreads: ["software"], resolvedThreads: ["work"], trustChange: 5 },
    });
    expect(next.conversationFacts.length).toBe(1);
    expect(next.unresolvedThreads).toContain("software");
    expect(next.unresolvedThreads).not.toContain("work");
    expect(next.activeCharacter.trust).toBe(65);
  });
});

describe("Event engine §28", () => {
  it("valid event schema", () => {
    const ev = { id: "ev1", type: "misunderstanding", effect: "Room confusion", probability: 0.3 };
    expect(dynamicEventSchema.safeParse(ev).success).toBe(true);
  });
  it("invalid event missing effect", () => {
    expect(dynamicEventSchema.safeParse({ id: "ev1", type: "x" }).success).toBe(false);
  });
});

describe("AI response contract §48", () => {
  it("valid response", () => {
    const r = { responseText: "Hi there! How are you?", stateUpdate: { currentTopic: "greeting", trustChange: 2 } };
    expect(conversationAIResponseSchema.safeParse(r).success).toBe(true);
  });
});

describe("Duplicate avoidance §65", () => {
  it("fingerprint deduplication local", async () => {
    const { isDuplicateScenario, rememberScenario, clearFingerprints } = await import("@/lib/conversation/engines/fingerprint");
    clearFingerprints();
    const sc = mockScenario({ mode: "travel", difficulty: "normal", surpriseLevel: "low", conflictIntensity: "none", characterStyle: "friendly", pressure: "normal", duration: "10 min" } as unknown as import("@/types/conversation-world").ConversationSettings);
    expect(isDuplicateScenario(sc)).toBe(false);
    rememberScenario(sc);
    expect(isDuplicateScenario(sc)).toBe(true);
    clearFingerprints();
  });
});
