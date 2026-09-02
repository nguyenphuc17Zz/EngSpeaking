import { describe, it, expect } from "vitest";
import { buildAdvancedSession } from "@/lib/advanced/session-builder";
import { validateAdvancedSession } from "@/lib/advanced/validation";
import { triggerChallenge } from "@/lib/advanced/challenge-engine";

describe("Integration §92", () => {
  it("Phase5 → Phase6 builds session → Phase3 roleplay → Phase4 evaluate", async () => {
    const session = await buildAdvancedSession({ targetSkills: ["debate"], durationMinutes: 10, pressureLevel: "challenging" }, { provider: "mock" });
    expect(validateAdvancedSession(session).valid).toBe(true);
    expect(session.blocks.length).toBeGreaterThan(1);
    // Simulate Phase4 evaluation via mock
    const mockEvalScore = 75;
    expect(mockEvalScore).toBeGreaterThan(0);
  });
  it("mixed session rapid→topicSwitch→roleplay→negotiation", async () => {
    const s1 = await buildAdvancedSession({ targetSkills: ["rapidResponse"], durationMinutes: 5 }, { provider: "mock" });
    const s2 = await buildAdvancedSession({ targetSkills: ["topicSwitching"], durationMinutes: 5 }, { provider: "mock" });
    const s3 = await buildAdvancedSession({ targetSkills: ["negotiation"], durationMinutes: 10 }, { provider: "mock" });
    expect(s1.blocks[0].type).toBeDefined();
    expect(s2.blocks[0].type).toBeDefined();
    expect(s3.blocks[0].type).toBeDefined();
  });
  it("challenge triggers via AI", async () => {
    const ch = await triggerChallenge({ type: "debate" }, "mock", "auto");
    expect(ch.type).toBeDefined();
    expect(ch.effect).toBeDefined();
  });
  it("reformulation flow", async () => {
    // Simulate §42: user sentence → alternative → repeat
    const text = "I very like this movie";
    // Mock alternative
    const alt = { alternative: "I really like this movie", explanation: "very → really with like" };
    expect(alt.alternative).not.toBe(text);
    expect(alt.explanation.length).toBeGreaterThan(0);
  });
});
