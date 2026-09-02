import { describe, it, expect } from "vitest";
import { ensureRegistry, getRegistry } from "@/lib/advanced/registry";
import { validateAdvancedSession } from "@/lib/advanced/validation";
import { generateMockSession } from "@/lib/advanced/mock/mock-session";

describe("Advanced module registry §4", () => {
  it("registers 25 modules", async () => {
    await ensureRegistry();
    expect(getRegistry().size).toBe(25);
    expect(getRegistry().has("debate")).toBe(true);
    expect(getRegistry().has("highPressure")).toBe(true);
  });
  it("session composition valid", async () => {
    await ensureRegistry();
    const session = generateMockSession("debate" as any, { targetSkills: ["debate"], durationMinutes: 10, pressureLevel: "challenging" });
    expect(session.blocks.length).toBeGreaterThan(0);
    expect(validateAdvancedSession(session).valid).toBe(true);
  });
  it("duration respected", () => {
    const s5 = generateMockSession("spontaneous" as any, { targetSkills: [], durationMinutes: 5 });
    expect(s5.estimatedDurationMinutes).toBe(5);
    const s20 = generateMockSession("longForm" as any, { targetSkills: [], durationMinutes: 20 });
    expect(s20.estimatedDurationMinutes).toBe(20);
  });
  it("challenge triggering included", () => {
    const s = generateMockSession("highPressure" as any, { targetSkills: [], durationMinutes: 10, pressureLevel: "extreme" });
    expect(s.challenges.length).toBeGreaterThan(0);
  });
  it("support fading: long session has support levels", () => {
    const s = generateMockSession("longForm" as any, { targetSkills: [], durationMinutes: 10 });
    expect(s.blocks.some((b) => b.difficulty.supportLevel != null)).toBe(true);
  });
  it("objective validation", () => {
    const s = generateMockSession("interview" as any, { targetSkills: ["interview"], durationMinutes: 10 });
    expect(s.blocks.every((b) => b.objective.length > 5)).toBe(true);
  });
});
