import { describe, it, expect } from "vitest";
import { calculateTrend, movingAverage, calculateVariance } from "@/lib/progress/services/trend-service";
import { evaluateMilestones } from "@/lib/progress/services/milestone-service";
import { comparePeriods } from "@/lib/progress/services/comparison-service";

describe("Trend calculations §69", () => {
  it("moving average", () => {
    expect(movingAverage([1,2,3,4,5], 3)).toEqual([1,1.5,2,3,4]);
  });
  it("variance", () => {
    expect(calculateVariance([10,10,10])).toBe(0);
    expect(calculateVariance([0,100])).toBeGreaterThan(0);
  });
  it("improving trend", () => {
    const t = calculateTrend([40,50,60,70]);
    expect(["improving","strongly_improving"]).toContain(t.trend);
    expect(t.confidence).toBeDefined();
  });
  it("plateau detection", () => {
    const t = calculateTrend([62,64,63,64,63]);
    expect(["plateau","stable"]).toContain(t.trend);
  });
  it("insufficient data", () => {
    const t = calculateTrend([50]);
    expect(t.trend).toBe("insufficient_data");
  });
  it("breakthrough detection via service", async () => {
    const { detectBreakthrough } = await import("@/lib/progress/services/trend-service");
    expect(detectBreakthrough([40,42,41,70])).toBe(true);
    expect(detectBreakthrough([50,51,52])).toBe(false);
  });
});

describe("Milestone conditions §30-31", () => {
  it("awards first milestones once", () => {
    const ms = evaluateMilestones({ skillHistory: [{ skillId: "response_speed", mastery: 0.8, practiceCount: 6 }], sessionCount: 6, hasRoleplay: true, hasPressureSuccess: true, existing: [] });
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.some((m) => m.type === "streak_5")).toBe(true);
  });
  it("does not duplicate", () => {
    const existing = [{ id: "1", type: "first_complete_spoken_answer", title: "", description: "", achievedAt: new Date().toISOString(), significance: "minor" as const }];
    const ms = evaluateMilestones({ skillHistory: [], sessionCount: 10, hasRoleplay: false, hasPressureSuccess: false, existing });
    expect(ms.some((m) => m.type === "first_complete_spoken_answer")).toBe(false);
  });
});

describe("Comparison §68", () => {
  it("improved vs declined", () => {
    const a = [{ capturedAt: new Date().toISOString(), overall: 50, dimensions: { fluency: 50 } }];
    const b = [{ capturedAt: new Date().toISOString(), overall: 70, dimensions: { fluency: 70 } }];
    const res = comparePeriods(a, b) as { status: string; deltas: Record<string, number> };
    expect(res.status).toBe("improved");
    expect(res.deltas.overall).toBeGreaterThan(0);
  });
  it("not comparable when empty", () => {
    const res = comparePeriods([], []);
    expect(res.status).toBe("not_comparable");
  });
});
