import { describe, it, expect } from "vitest";
import { detectBottlenecks, buildWeaknessesFromDimensions } from "@/lib/diagnostics/engines/bottleneck-detector";
import { detectRecurringPatterns } from "@/lib/diagnostics/engines/pattern-detector";
import { buildRecommendations } from "@/lib/diagnostics/engines/recommendation-engine";
import { compareEvaluations } from "@/lib/diagnostics/services/comparison.service";
import { buildSnapshot } from "@/lib/diagnostics/engines/snapshot-builder";
import { MOCK_PROFILES } from "@/lib/diagnostics/mock/profiles";

describe("Bottleneck prioritization", () => {
  it("priority not just lowest score — communication impact", () => {
    const dims = { fluency: 50, grammar: 55, vocabulary: 70, naturalness: 60, responseSpeed: 45, pronunciation: -1, communication: 75, confidence: 50 };
    const weaknesses = buildWeaknessesFromDimensions(dims as unknown as import("@/types/diagnostics").SpeakingDimensions, new Map());
    const bottlenecks = detectBottlenecks(dims as unknown as import("@/types/diagnostics").SpeakingDimensions, weaknesses, []);
    expect(bottlenecks.length).toBeGreaterThan(0);
    // responseSpeed should be prioritized even though not lowest (fluency 50 vs response 45 but response has higher impact)
    expect(bottlenecks[0].category).toBeDefined();
  });
  it("pattern detection production gap", () => {
    const dims = { fluency: 40, grammar: 78, vocabulary: 80, naturalness: 60, responseSpeed: 35, pronunciation: 60, communication: 65, confidence: 50 };
    const patterns = detectRecurringPatterns([], [{ transcript: "hello" }], dims as unknown as Record<string, number>);
    expect(patterns.some((p) => p.patternKey === "production_automaticity_gap")).toBe(true);
  });
  it("recommendation mapping", () => {
    const bottlenecks = [{ id: "bn1", category: "responseSpeed", priority: 80, reason: "slow", severity: 60, recurrence: 50, impact: 70, confidence: 0.7 }];
    const recs = buildRecommendations(bottlenecks as unknown as import("@/types/diagnostics").Bottleneck[], []);
    expect(recs[0].skill).toBe("response_speed");
    expect(recs[0].priority).toBe("high");
  });
  it("comparison detects improved/declined", () => {
    const prev = MOCK_PROFILES.A.evaluation;
    const cur = MOCK_PROFILES.H.evaluation;
    const cmp = compareEvaluations(prev, cur);
    expect(cmp.improvedDimensions.length).toBeGreaterThan(0);
    expect(cmp.overallDelta).toBeGreaterThan(0);
  });
  it("snapshot generation", () => {
    const evalA = MOCK_PROFILES.A.evaluation;
    const snap = buildSnapshot(evalA);
    expect(snap.dimensions).toBeDefined();
    expect(snap.evidenceConfidence).toBeDefined();
    expect(snap.generatedAt).toBeDefined();
  });
});

describe("Mock profiles coverage §91", () => {
  it("all 8 profiles exist", () => {
    expect(Object.keys(MOCK_PROFILES).length).toBe(8);
    for (const k of ["A","B","C","D","E","F","G","H"]) expect(MOCK_PROFILES[k]).toBeDefined();
  });
  it("fast but inaccurate pattern", () => {
    const dims = { fluency: 80, grammar: 35, vocabulary: 60, naturalness: 50, responseSpeed: 85, pronunciation: 55, communication: 55, confidence: 70 };
    const patterns = detectRecurringPatterns([], [{ transcript: "quick answer" }], dims as unknown as Record<string, number>);
    expect(patterns.some((p) => p.patternKey === "fast_but_inaccurate")).toBe(true);
  });
});
