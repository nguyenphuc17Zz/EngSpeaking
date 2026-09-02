import { describe, it, expect } from "vitest";
import { computeTurnMetrics, computeSessionMetrics } from "@/lib/diagnostics/engines/deterministic-metrics";
import { analyzeFluency } from "@/lib/diagnostics/engines/fluency-analyzer";
import { analyzeResponseSpeed } from "@/lib/diagnostics/engines/response-speed-analyzer";
import { analyzeGrammar } from "@/lib/diagnostics/engines/grammar-analyzer";
import { analyzePronunciation } from "@/lib/diagnostics/engines/pronunciation-analyzer";

describe("Deterministic metrics", () => {
  it("turn metrics word count & filler", () => {
    const m = computeTurnMetrics({ turnId: "t1", transcript: "Um I think so, you know", durationMs: 5000 });
    expect(m.wordCount).toBeGreaterThan(3);
    expect(m.fillerCount).toBeGreaterThan(0);
    expect(m.uniqueWordCount).toBeGreaterThan(0);
  });
  it("session metrics completeness", () => {
    const s = computeSessionMetrics([{ transcript: "hello" }]);
    expect(s.completeness).toBe("too_short");
    const s2 = computeSessionMetrics(Array.from({ length: 6 }, () => ({ transcript: "I went to the park yesterday" })));
    expect(["partial", "sufficient", "rich"]).toContain(s2.completeness);
  });
  it("response speed stats", () => {
    const r = analyzeResponseSpeed([{ timeToFirstWordMs: 800 }, { timeToFirstWordMs: 1200 }, { timeToFirstWordMs: 5000 }]);
    expect(r.stats.avg).toBeDefined();
    expect(r.stats.p90).toBeGreaterThan(1000);
    expect(r.score).toBeLessThan(70); // avg high due to 5000
  });
  it("pronunciation not_available when no audio", () => {
    const p = analyzePronunciation([{ transcript: "hello" }], false);
    expect(p.status).toBe("not_available");
    expect(p.score).toBe(-1);
  });
  it("pronunciation with confidence", () => {
    const p = analyzePronunciation([{ transcript: "hello", confidence: 0.9 }], true);
    expect(p.status).toBe("high");
    expect(p.score).toBeGreaterThan(70);
  });
  it("grammar detection", () => {
    const { issues, score } = analyzeGrammar([{ turnId: "t1", transcript: "I go yesterday" }]);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].recurrenceKey).toBe("past_tense_verb_form");
    expect(score).toBeLessThan(100);
  });
  it("fluency filler rate", () => {
    const f = analyzeFluency([{ transcript: "Um uh I think um you know it's good", durationMs: 4000 }]);
    expect(f.metrics.fillerRate).toBeGreaterThan(0.05);
  });
});
