// FoundationSessionEngine + SessionBuilder §38, §44
import type { FoundationSession, FoundationAttempt, FoundationExercise, FoundationSkill } from "@/types/foundation";

export interface SessionBuilderConfig {
  mode: "learn" | "practice" | "challenge" | "daily";
  durationMinutes?: number; // 5-15 for Daily
  focusSkill?: FoundationSkill;
  startDifficulty?: number;
}

export interface FoundationSessionEngine {
  createSession(exercise: FoundationExercise, mode: SessionBuilderConfig["mode"]): FoundationSession;
  addAttempt(session: FoundationSession, attempt: FoundationAttempt): FoundationSession;
  completeSession(session: FoundationSession): FoundationSession;
  abandonSession(session: FoundationSession): FoundationSession;
  buildNextExercise(session: FoundationSession, lastEvaluation?: import("@/types/foundation").FoundationEvaluation): Promise<FoundationExercise>;
}

export interface FoundationSessionBuilder {
  buildDailyPlan(opts: SessionBuilderConfig & { recentPerformance?: string }): Promise<FoundationExercise[]>;
  buildSequence(skill: FoundationSkill, count: number, startDifficulty: number): Promise<FoundationExercise[]>;
}
