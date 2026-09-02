import { describe, it, expect } from "vitest";
import { mockEvaluation } from "@/lib/foundation/services/evaluator.service";
import { mockExercise } from "@/lib/foundation/services/exercise-generator.service";
import { mockHint } from "@/lib/foundation/services/hint.service";
import { decideNextDifficultySync } from "@/lib/foundation/difficulty/engine";
import { createFoundationSession, addAttemptToSession, completeFoundationSession } from "@/lib/foundation/services/session-engine.service";

describe("Evaluation §39 §55 §58", () => {
  it("mock evaluation returns overall 0-100 and classification", () => {
    const ex = mockExercise({ skill: "sentence_retrieval", type: "one_sentence" });
    const ev = mockEvaluation(ex, "I went to the park yesterday", { hintsUsed: 0, timeToFirstWordMs: 1200 });
    expect(ev.score.overall).toBeGreaterThanOrEqual(0);
    expect(ev.score.overall).toBeLessThanOrEqual(100);
    expect(["too_easy", "appropriate", "too_hard"]).toContain(ev.classification);
  });
  it("insufficient evidence when empty transcript", () => {
    const ex = mockExercise({});
    const ev = mockEvaluation(ex, "", { hintsUsed: 0 });
    expect(ev.score.insufficientEvidence).toBe(true);
  });
  it("filler detection", () => {
    const ex = mockExercise({});
    const ev = mockEvaluation(ex, "Um I think uh like you know it's good", { hintsUsed: 0 });
    expect(ev.score.fillerCount).toBeGreaterThan(0);
  });
});

describe("Hint progression §56", () => {
  it("hint levels 0-4 return different types", () => {
    const ex = mockExercise({});
    for (let l = 0; l <= 4; l++) {
      const h = mockHint(ex, l);
      expect(h.level).toBe(l);
      expect(h.hint.length).toBeGreaterThan(5);
    }
  });
});

describe("Session engine §38", () => {
  it("create → add attempt → complete", () => {
    const ex = mockExercise({});
    let sess = createFoundationSession(ex, "practice");
    expect(sess.status).toBe("active");
    sess = addAttemptToSession(sess, { id: "a1", exerciseId: ex.id, transcript: "hello", rawTranscript: "hello", hintsUsed: 0, hintLevel: 0, completed: true, createdAt: new Date().toISOString() });
    expect(sess.attempts.length).toBe(1);
    sess = completeFoundationSession(sess);
    expect(sess.status).toBe("completed");
    expect(sess.completedAt).toBeDefined();
  });
});

describe("Difficulty next §42 §43", () => {
  it("too_easy increases, too_hard decreases", () => {
    const ex = mockExercise({ difficulty: 5 });
    const easyEv = mockEvaluation(ex, "This is a very good expanded answer with details where and when and why I enjoy it", { hintsUsed: 0, timeToFirstWordMs: 800 });
    // force classification
    const easy = { ...easyEv, classification: "too_easy" as const, suggestedDifficultyDelta: 1 as const, score: { ...easyEv.score, overall: 90 } };
    const hard = { ...easyEv, classification: "too_hard" as const, suggestedDifficultyDelta: -1 as const, score: { ...easyEv.score, overall: 30 } };
    expect(decideNextDifficultySync(ex, easy).nextDifficulty).toBe(6);
    expect(decideNextDifficultySync(ex, hard).nextDifficulty).toBe(4);
  });
});
