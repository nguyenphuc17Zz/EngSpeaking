// Central Voice Engine orchestrator — extracts scattered logic from session/page §63
// Used by both Phase 1 /session and Phase 2 /foundation/practice
// Handles: recorder↔STT↔LLM↔TTS with FSM, without duplicating code

import type { SessionStatus } from "@/types/conversation";

export type VoiceEngineState = SessionStatus;

export interface VoiceEngineConfig {
  conversation: { provider: string; model: string };
  stt: { provider: string; model: string };
  tts: { provider: string; model: string };
}

// Minimal orchestrator for foundation exercises — keeps ability to plug future realtime
export interface VoiceTurn {
  role: "user" | "assistant";
  text: string;
}

// Re-export helpers for turn timing
export function measureTimeToFirstWord(startMs: number): number {
  return Date.now() - startMs;
}

// Placeholder for future queue; Phase 2 uses browser TTS directly
export function isBrowserSTT(cfg: VoiceEngineConfig): boolean {
  return cfg.stt.provider === "browser";
}
export function isBrowserTTS(cfg: VoiceEngineConfig): boolean {
  return cfg.tts.provider === "browser" && cfg.tts.model === "browser-tts";
}
