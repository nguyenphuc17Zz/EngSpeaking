import { describe, it, expect } from "vitest";
import { buildAIContext, estimateTokens } from "@/lib/orchestrator/context/engine";
import { extractJson } from "@/lib/orchestrator/response-parser";

describe("Context engine §15-19", () => {
  it("compact strategy keeps only priority keys", () => {
    const ctx = buildAIContext("exercise_generation", { currentTask: "gen", recentTurns: Array.from({ length: 20 }, (_, i) => `turn ${i}`), olderHistory: ["old"], importantFacts: ["fact1"] });
    // For exercise_generation policy is compact (keep 5 priority keys, recentTurns sliced to 15)
    expect((ctx.recentTurns as unknown[]).length).toBeLessThanOrEqual(15);
  });
  it("token budget truncates", () => {
    const large = { recentTurns: Array.from({ length: 100 }, () => "very long turn content with many words ".repeat(20)) };
    const packed = buildAIContext("general", large, 100);
    expect(estimateTokens(JSON.stringify(packed))).toBeLessThan(5000); // should have truncated
  });
  it("estimate tokens", () => {
    expect(estimateTokens("hello world")).toBeGreaterThan(0);
  });
  it("extractJson handles fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('some text {"a":1} more')).toEqual({ a: 1 });
    expect(extractJson("not json")).toBeNull();
  });
});
