import { describe, it, expect } from "vitest";
import { runDiagnosticsPipeline } from "@/lib/diagnostics/pipeline";

describe("Integration: Phase 3 conversation → Evaluation → Snapshot → Persistence §94", () => {
  it("full pipeline mock flow", async () => {
    const turns = [
      { turnId: "t1", transcript: "Hello, I work at a software company.", durationMs: 3000, timeToFirstWordMs: 900 },
      { turnId: "t2", transcript: "I usually go to work by train.", durationMs: 2500, timeToFirstWordMs: 1100 },
      { turnId: "t3", transcript: "Last weekend I went to the park with my friends.", durationMs: 4000, timeToFirstWordMs: 1500 },
      { turnId: "t4", transcript: "I very like this movie, it's very good.", durationMs: 3200, timeToFirstWordMs: 2000 },
    ];
    const { evaluation, snapshot } = await runDiagnosticsPipeline({ sessionId: "test_sess_1", sessionType: "conversation_worlds", turns, hasAudio: false }, { provider: "mock" });
    expect(evaluation.overallPracticeScore).toBeGreaterThan(0);
    expect(evaluation.dimensions.fluency).toBeDefined();
    expect((evaluation.grammarIssues || []).length).toBeGreaterThan(0); // very like should trigger
    expect(evaluation.turnEvaluations?.length).toBe(4);
    expect(evaluation.recommendations.length).toBeGreaterThan(0);
    expect(snapshot.recommendedSkills.length).toBeGreaterThan(0);
    expect(snapshot.primaryBottleneck).toBeDefined();
  });

  it("too_short completeness when 1 turn", async () => {
    const { evaluation } = await runDiagnosticsPipeline({ sessionId: "short", turns: [{ turnId: "t1", transcript: "Hi" }], hasAudio: false }, { provider: "mock" });
    expect(evaluation.completeness).toBe("too_short");
    expect(evaluation.confidence.overall).toBe("low");
  });

  it("pronunciation unavailable when no audio", async () => {
    const { evaluation } = await runDiagnosticsPipeline({ sessionId: "pron", turns: [{ turnId: "t1", transcript: "Hello world, how are you today?" }], hasAudio: false }, { provider: "mock" });
    expect(evaluation.dimensions.pronunciation).toBe(-1);
  });

  it("handles empty transcript gracefully", async () => {
    const { evaluation } = await runDiagnosticsPipeline({ sessionId: "empty", turns: [{ turnId: "t1", transcript: "" }, { turnId: "t2", transcript: "I think it's good" }], hasAudio: false }, { provider: "mock" });
    expect(evaluation.completeness).toBeDefined();
    expect(evaluation.overallPracticeScore).toBeGreaterThan(0);
  });
});
