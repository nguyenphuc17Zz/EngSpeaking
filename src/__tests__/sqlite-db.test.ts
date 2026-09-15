import { describe, it, expect, beforeEach } from "vitest";
import {
  sessionRepo,
  foundationRepo,
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

  it("records and queries telemetry", () => {
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
