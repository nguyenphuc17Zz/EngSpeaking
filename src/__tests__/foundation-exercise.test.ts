import { describe, it, expect } from "vitest";
import { foundationExerciseSchema, generateExerciseRequestSchema } from "@/lib/validation/foundation-schemas";
import { mockExercise } from "@/lib/foundation/services/exercise-generator.service";
import { dimsToScalar, scalarToDims, adjustScalar } from "@/lib/foundation/difficulty/model";

describe("Exercise generation §36-37 §57", () => {
  it("validates valid exercise schema", () => {
    const ex = mockExercise({ skill: "sentence_retrieval", type: "one_sentence", difficulty: 5 });
    expect(foundationExerciseSchema.safeParse(ex).success).toBe(true);
  });
  it("rejects invalid exercise (missing instruction)", () => {
    const bad = { id: "x", skill: "sentence_retrieval", type: "one_sentence", level: 4, difficulty: 5, evaluationCriteria: [] } as unknown;
    expect(foundationExerciseSchema.safeParse(bad).success).toBe(false);
  });
  it("difficulty boundaries 1-10", () => {
    for (let d = 1; d <= 10; d++) {
      const ex = mockExercise({ difficulty: d });
      expect(ex.difficulty).toBe(d);
      expect(ex.level).toBeGreaterThanOrEqual(0);
      expect(ex.level).toBeLessThanOrEqual(10);
    }
  });
  it("generate request schema validates", () => {
    expect(generateExerciseRequestSchema.safeParse({ skill: "sentence_retrieval", type: "one_sentence", difficulty: 5 }).success).toBe(true);
    expect(generateExerciseRequestSchema.safeParse({ difficulty: 11 }).success).toBe(false);
  });
});

describe("Difficulty model §41", () => {
  it("dims ↔ scalar roundtrip", () => {
    for (let s = 1; s <= 10; s++) {
      const dims = scalarToDims(s);
      const scalar = dimsToScalar(dims);
      expect(Math.abs(scalar - s)).toBeLessThanOrEqual(1);
    }
  });
  it("adjust logic §42", () => {
    expect(adjustScalar(5, "too_easy")).toBe(6);
    expect(adjustScalar(5, "too_hard")).toBe(4);
    expect(adjustScalar(10, "too_easy")).toBe(10);
    expect(adjustScalar(1, "too_hard")).toBe(1);
    expect(adjustScalar(5, "appropriate")).toBe(5);
  });
});
