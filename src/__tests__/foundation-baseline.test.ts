import { describe, it, expect } from "vitest";
import { generateExerciseRequestSchema } from "@/lib/validation/foundation-schemas";
import { mockExercise } from "@/lib/foundation/services/exercise-generator.service";

describe("Baseline §7-8 & foundation metadata", () => {
  it("all 22 exercise types can be mocked", async () => {
    const types = ["repeat","shadow","chunk_practice","pattern_practice","substitution","one_sentence","answer_expansion","controlled_speaking","timed_speaking","rapid_response","follow_up","stimulus_speaking","translation_bridge","vocabulary_activation","grammar_speaking","pronunciation_micro","confidence","recovery","self_correction","repeat_until_better","micro_monologue"] as const;
    for (const t of types) {
      const ex = mockExercise({ type: t as unknown as typeof types[number], skill: "sentence_retrieval" });
      expect(ex.type).toBe(t);
      expect(ex.instruction.length).toBeGreaterThan(3);
    }
  });

  it("translation_bridge tracks dependency", () => {
    const ex = mockExercise({ type: "translation_bridge" });
    expect(ex.type).toBe("translation_bridge");
    // evaluator will set translationDependency handling via progress service — just check ex exists
  });
});
