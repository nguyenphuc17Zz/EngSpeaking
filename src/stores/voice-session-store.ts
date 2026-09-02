// Zustand voice session store — deterministic FSM, not scattered booleans §17, §28
"use client";

import { create } from "zustand";
import type { ConversationSession, ConversationTurn, SessionStatus } from "@/types/conversation";
import { canTransition } from "@/features/voice-session/state/machine";
import { logger } from "@/lib/logger";

interface VoiceSessionState {
  session: ConversationSession | null;
  status: SessionStatus;
  errorCode?: string;
  errorMessage?: string;

  // Actions
  createSession: (opts: { provider: string; model: string; sttProvider: string; sttModel: string; ttsProvider: string; ttsModel: string }) => ConversationSession;
  setStatus: (next: SessionStatus, error?: { code?: string; message?: string }) => boolean;
  addTurn: (turn: ConversationTurn) => void;
  updateLastTurn: (patch: Partial<ConversationTurn>) => void;
  setTurns: (turns: ConversationTurn[]) => void;
  setError: (code: string, message: string) => void;
  clearError: () => void;
  endSession: () => void;
  reset: () => void;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const useVoiceSessionStore = create<VoiceSessionState>((set, get) => ({
  session: null,
  status: "idle",
  errorCode: undefined,
  errorMessage: undefined,

  createSession: (opts) => {
    const session: ConversationSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      status: "starting",
      turns: [],
      provider: opts.provider,
      model: opts.model,
      sttProvider: opts.sttProvider,
      sttModel: opts.sttModel,
      ttsProvider: opts.ttsProvider,
      ttsModel: opts.ttsModel,
    };
    set({ session, status: "starting", errorCode: undefined, errorMessage: undefined });
    logger.sessionStarted({ id: session.id, provider: opts.provider, model: opts.model });
    return session;
  },

  setStatus: (next, error) => {
    const { status: current } = get();
    if (!canTransition(current, next)) {
      logger.debug("invalid_transition", { from: current, to: next });
      // Still allow error transitions
      if (next !== "error") return false;
    }
    set({
      status: next,
      session: get().session ? { ...get().session!, status: next, ...(error ? { errorCode: error.code, errorMessage: error.message } : {}) } : null,
      ...(error ? { errorCode: error.code, errorMessage: error.message } : { errorCode: undefined, errorMessage: undefined }),
    });
    return true;
  },

  addTurn: (turn) => {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, turns: [...s.turns, turn] } });
  },

  updateLastTurn: (patch) => {
    const s = get().session;
    if (!s || s.turns.length === 0) return;
    const turns = [...s.turns];
    turns[turns.length - 1] = { ...turns[turns.length - 1], ...patch };
    set({ session: { ...s, turns } });
  },

  setTurns: (turns) => {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, turns } });
  },

  setError: (code, message) => {
    const { status } = get();
    if (!canTransition(status, "error") && status !== "error") {
      logger.debug("invalid_error_transition", { from: status });
      return;
    }
    set({ status: "error", errorCode: code, errorMessage: message, session: get().session ? { ...get().session!, status: "error", errorCode: code, errorMessage: message } : null });
    logger.error({ code, message });
  },

  clearError: () => {
    const { status } = get();
    if (status === "error") {
      set({ status: "idle", errorCode: undefined, errorMessage: undefined, session: get().session ? { ...get().session!, status: "idle", errorCode: undefined, errorMessage: undefined } : null });
    } else {
      set({ errorCode: undefined, errorMessage: undefined });
    }
  },

  endSession: () => {
    const s = get().session;
    const { status } = get();
    if (!s) return;
    if (!canTransition(status, "completed")) {
      logger.debug("invalid_end_transition", { from: status });
      return;
    }
    const ended = { ...s, status: "completed" as const, endedAt: new Date().toISOString() };
    set({ session: ended, status: "completed" });
  },

  reset: () => set({ session: null, status: "idle", errorCode: undefined, errorMessage: undefined }),
}));
