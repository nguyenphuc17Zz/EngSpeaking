import { describe, it, expect, beforeEach } from "vitest";
import {
  sessionRepo,
  foundationRepo,
  evaluationRepo,
  progressRepo,
  curriculumRepo,
  telemetryRepo,
  healthRepo,
} from "@/lib/db/sqlite-db";

describe("Unified SQLite Database", () => {
  it("creates and retrieves sessions and conversation turns", () => {
    const sessionId = `test_sess_${Date.now()}`;
    const session = sessionRepo.create({
      id: sessionId,
      started_at: new Date().toISOString(),
      ended_at: null,
      status: "active",
      provider: "gemini",
      model: "gemini-2.5-flash",
      stt_provider: "whisper",
      stt_model: "whisper-base",
      tts_provider: "edge",
      tts_model: "en-US-GuyNeural",
    });

    expect(session.id).toBe(sessionId);
    const retrieved = sessionRepo.get(sessionId);
    expect(retrieved?.status).toBe("active");
    expect(retrieved?.provider).toBe("gemini");

    // Add turn
    const turn = sessionRepo.addTurn({
      id: `turn_${Date.now()}`,
      session_id: sessionId,
      role: "user",
      text: "Hello world",
      timestamp: new Date().toISOString(),
      duration_ms: 1200,
    });
    expect(turn.text).toBe("Hello world");

    const turns = sessionRepo.getTurns(sessionId);
    expect(turns.length).toBe(1);
    expect(turns[0].text).toBe("Hello world");

    // Complete session
    sessionRepo.updateStatus(sessionId, "completed");
    const updated = sessionRepo.get(sessionId);
    expect(updated?.status).toBe("completed");
  });

  it("handles foundation sessions and attempts", () => {
    const fsId = `fs_${Date.now()}`;
    foundationRepo.createSession({
      id: fsId,
      exercise_id: "ex_101",
      mode: "practice",
      skill: "sentence_retrieval",
      difficulty: 3,
      exercise_type: "one_sentence",
      started_at: new Date().toISOString(),
      completed_at: null,
      status: "active",
    });

    const attempt = foundationRepo.recordAttempt({
      id: `att_${Date.now()}`,
      session_id: fsId,
      exercise_id: "ex_101",
      transcript: "I am going to the store.",
      raw_transcript: "i am going to the store",
      duration_ms: 2500,
      time_to_first_word_ms: 300,
      hints_used: 1,
      hint_level: 1,
      score_overall: 92,
      completed: true,
    });

    expect(attempt.score_overall).toBe(92);
    const attempts = foundationRepo.getAttempts(fsId);
    expect(attempts.length).toBe(1);
    expect(attempts[0].transcript).toBe("I am going to the store.");

    foundationRepo.completeSession(fsId);
    const fsSess = foundationRepo.getSession(fsId);
    expect(fsSess?.status).toBe("completed");
  });

  it("saves and retrieves speaking evaluations", () => {
    const evalId = `eval_${Date.now()}`;
    const sessId = `sess_${Date.now()}`;
    evaluationRepo.save({
      id: evalId,
      session_id: sessId,
      session_type: "vn_to_en",
      overall_practice_score: 88,
      dimensions: { fluency: 85, pronunciation: 90 },
      confidence: { overall: 0.9 },
      completeness: "sufficient",
      evaluation: { feedback: "Good job!" },
      snapshot: { metrics: {} },
      evaluator_version: "4.0.0",
      schema_version: 1,
      generated_at: new Date().toISOString(),
    });

    const bySess = evaluationRepo.getBySession(sessId);
    expect(bySess).not.toBeNull();
    expect(bySess.overall_practice_score).toBe(88);
    expect(bySess.dimensions.pronunciation).toBe(90);
  });

  it("handles progress analytics and milestones", () => {
    const learnerId = `learner_${Date.now()}`;
    progressRepo.recordSkillHistory({
      learner_state_id: learnerId,
      skill_id: "fluency",
      mastery: 0.75,
      confidence: 0.8,
    });

    const history = progressRepo.getSkillHistory(learnerId, "fluency");
    expect(history.length).toBe(1);
    expect(history[0].mastery).toBe(0.75);

    progressRepo.recordMilestone({
      learner_state_id: learnerId,
      type: "first_perfect_score",
      title: "First 90+ Score",
      description: "Achieved over 90 on fluency",
      significance: "major",
    });

    const milestones = progressRepo.getMilestones(learnerId);
    expect(milestones.length).toBe(1);
    expect(milestones[0].title).toBe("First 90+ Score");
  });

  it("saves and retrieves curriculum plans and telemetry", () => {
    const planId = `plan_${Date.now()}`;
    curriculumRepo.savePlan({
      id: planId,
      learner_state_id: "default_learner",
      title: "Focus on Fluency",
      objective: "Reduce speaking latency",
      estimated_duration_minutes: 15,
      primary_skill: "fluency",
      expected_outcome: "Drop latency below 1.5s",
    });

    const retrievedPlan = curriculumRepo.getPlan(planId);
    expect(retrievedPlan?.title).toBe("Focus on Fluency");

    telemetryRepo.recordAiRequest({
      request_id: `req_${Date.now()}`,
      task: "scenario_generation",
      provider_id: "gemini",
      model_id: "gemini-2.5-flash",
      status: "success",
      latency_ms: 320,
    });

    const health = healthRepo.checkHealth();
    expect(health.status).toBe("ok");
    expect(health.tablesCount).toBeGreaterThan(5);
  });
});
