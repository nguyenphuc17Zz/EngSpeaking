// FoundationSessionEngine concrete impl — modular for Phase 5 replacement
import type { FoundationSession, FoundationAttempt, FoundationExercise } from "@/types/foundation";
import { generateExercise } from "./exercise-generator.service";
import { decideNextDifficultySync } from "@/lib/foundation/difficulty/engine";
import type { FoundationEvaluation } from "@/types/foundation";

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createFoundationSession(exercise: FoundationExercise, mode: FoundationSession["mode"]): FoundationSession {
  return {
    id: newId("fsess"),
    exerciseId: exercise.id,
    mode,
    startedAt: new Date().toISOString(),
    attempts: [],
    status: "active",
    skill: exercise.skill,
    difficulty: exercise.difficulty,
    type: exercise.type,
  };
}

export function addAttemptToSession(session: FoundationSession, attempt: FoundationAttempt): FoundationSession {
  return { ...session, attempts: [...session.attempts, attempt] };
}

export function completeFoundationSession(session: FoundationSession): FoundationSession {
  return { ...session, status: "completed", completedAt: new Date().toISOString() };
}

export function abandonFoundationSession(session: FoundationSession): FoundationSession {
  return { ...session, status: "abandoned", completedAt: new Date().toISOString() };
}

export async function buildNextExerciseForSession(
  session: FoundationSession,
  lastExercise: FoundationExercise,
  lastEvaluation?: FoundationEvaluation,
  opts?: { provider?: string; model?: string }
): Promise<FoundationExercise> {
  if (!lastEvaluation) {
    return generateExercise({ skill: session.skill, difficulty: session.difficulty, mode: session.mode }, opts);
  }
  const decision = decideNextDifficultySync(lastExercise, lastEvaluation);
  // Logic §43: freeze → recovery, succeeds repeatedly → expansion, struggles retrieval → retrieval again
  let nextSkill = session.skill;
  let nextType = lastExercise.type;

  if (lastEvaluation.classification === "too_hard" && (lastEvaluation.hintsUsed || 0) >= 2) {
    // Switch to confidence/recovery support
    if (Math.random() < 0.5) { nextSkill = "confidence"; nextType = "confidence"; }
    else { nextSkill = "recovery"; nextType = "recovery"; }
  } else if (lastEvaluation.classification === "too_easy") {
    // Move to expansion if retrieval succeeded
    if (session.skill === "sentence_retrieval") { nextSkill = "sentence_expansion"; nextType = "answer_expansion"; }
    else if (session.skill === "sentence_expansion") { nextSkill = "micro_monologue"; nextType = "micro_monologue"; }
  }
  // Early freeze detection: empty transcript or insufficientEvidence
  if (lastEvaluation.score.insufficientEvidence) {
    nextType = "recovery";
  }

  return generateExercise({ skill: nextSkill, type: nextType as FoundationExercise["type"], difficulty: decision.nextDifficulty, mode: session.mode }, opts);
}

// Daily plan builder 5-15 min §44, §46
export async function buildDailyPlan(opts: { durationMinutes?: number; recentPerformance?: string; provider?: string; model?: string }): Promise<FoundationExercise[]> {
  const totalMins = opts.durationMinutes ?? 10;
  const count = totalMins <= 5 ? 3 : totalMins <= 10 ? 5 : 7;
  const sequence: Array<{ skill: FoundationExercise["skill"]; type: FoundationExercise["type"] }> = [
    { skill: "speaking_repetition", type: "repeat" },
    { skill: "chunk_retrieval", type: "chunk_practice" },
    { skill: "sentence_retrieval", type: "one_sentence" },
    { skill: "sentence_expansion", type: "answer_expansion" },
    { skill: "response_speed", type: "rapid_response" },
    { skill: "recovery", type: "recovery" },
    { skill: "micro_monologue", type: "micro_monologue" },
  ];
  const picked = sequence.slice(0, count);
  const exercises: FoundationExercise[] = [];
  for (let i = 0; i < picked.length; i++) {
    const diff = i < 2 ? 4 : i < 4 ? 5 : 6;
    const ex = await generateExercise({ skill: picked[i].skill, type: picked[i].type, difficulty: diff, mode: "daily", previousPerformance: opts.recentPerformance }, { provider: opts.provider, model: opts.model });
    exercises.push(ex);
  }
  return exercises;
}
