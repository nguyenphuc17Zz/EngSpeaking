import { describe, it, expect } from "vitest";
import { generateReport } from "@/lib/progress/services/report-service";

describe("Progress Report §36-41", () => {
  it("generates mock report without AI", async () => {
    const report = await generateReport("30d", "default", { provider: "mock" });
    expect(report.headline).toBeDefined();
    expect(report.period.start).toBeDefined();
    expect(report.confidence).toBeGreaterThan(0);
  });
  it("report has required fields", async () => {
    const report = await generateReport("7d", "default", { provider: "mock" });
    expect(Array.isArray(report.majorImprovements)).toBe(true);
    expect(Array.isArray(report.persistentChallenges)).toBe(true);
    expect(Array.isArray(report.milestones)).toBe(true);
  });
});
