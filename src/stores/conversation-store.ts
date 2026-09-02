"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConversationWorldState, ConversationSummary, DynamicEvent } from "@/types/conversation-world";
import type { ConversationTurn } from "@/types/conversation";

interface ConvStore {
  world: ConversationWorldState | null;
  summary: ConversationSummary | null;
  turns: ConversationTurn[];
  isThinking: boolean;
  isGeneratingWorld: boolean;
  activeEvents: DynamicEvent[];
  setWorld: (w: ConversationWorldState | null) => void;
  setSummary: (s: ConversationSummary | null) => void;
  setTurns: (t: ConversationTurn[]) => void;
  addTurn: (t: ConversationTurn) => void;
  setThinking: (v: boolean) => void;
  setGeneratingWorld: (v: boolean) => void;
  pushEvent: (e: DynamicEvent) => void;
  reset: () => void;
}

export const useConversationStore = create<ConvStore>()(
  persist(
    (set) => ({
      world: null,
      summary: null,
      turns: [],
      isThinking: false,
      isGeneratingWorld: false,
      activeEvents: [],
      setWorld: (world) => set({ world }),
      setSummary: (summary) => set({ summary }),
      setTurns: (turns) => set({ turns }),
      addTurn: (t) => set((s) => ({ turns: [...s.turns, t] })),
      setThinking: (isThinking) => set({ isThinking }),
      setGeneratingWorld: (isGeneratingWorld) => set({ isGeneratingWorld }),
      pushEvent: (e) => set((s) => ({ activeEvents: [...s.activeEvents, e].slice(-5) })),
      reset: () => set({ world: null, summary: null, turns: [], isThinking: false, isGeneratingWorld: false, activeEvents: [] }),
    }),
    { name: "conversation_store", version: 2, partialize: (s) => ({ world: s.world, summary: s.summary, turns: s.turns.slice(-20), activeEvents: s.activeEvents }),
      migrate: (persisted, version) => {
        if (version === 1) {
          return { ...(persisted as ConvStore), world: null, summary: null, activeEvents: [] } as ConvStore;
        }
        return persisted as ConvStore;
      },
    }
  )
);
