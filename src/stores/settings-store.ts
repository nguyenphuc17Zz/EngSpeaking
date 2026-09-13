// Zustand settings store — client state per §28
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProviderSelectionState {
  provider: string; // "auto" | id
  model: string;
}

export interface AIProfileState {
  mode: "auto" | "manual";
  qualityPreference: "economy" | "balanced" | "quality";
  latencyPreference: "fast" | "balanced" | "quality";
  fallbackEnabled: boolean;
  contextOptimizationEnabled: boolean;
  showModelInfo: boolean;
}

export interface AudioEnhancementState {
  autoNormalize: boolean;
  micGain: number; // 1.0 -> 3.0 (x multiplier)
  noiseFloorGate: boolean;
}

export interface VocabularyKeybindings {
  playWord: string;       // "KeyA"
  playSentence: string;   // "KeyS"
  clearSpeech: string;    // "KeyZ"
  previousWord: string;   // "KeyQ" (Quay lại từ vừa bấm nhầm)
  toggleMic: string;      // "Space"
  submitOrNext: string;   // "Enter"
  toggleHints: string;    // "KeyH"
  randomWord: string;     // "KeyR"
  step1: string;          // "Digit1"
  step2: string;          // "Digit2"
}

export interface SettingsState {
  // Active Primary Engine Indicator
  activeProvider: "gemini" | "groq";
  preferredGeminiModel: string;
  preferredGroqModel: string;

  // Granular Task Settings (Foundation & Conversation)
  sentenceBuilderGen: ProviderSelectionState;
  sentenceBuilderEval: ProviderSelectionState;
  shadowing: ProviderSelectionState;
  survivalSpeaking: ProviderSelectionState;
  conversation: ProviderSelectionState;
  evaluation: ProviderSelectionState;
  generation: ProviderSelectionState;
  stt: ProviderSelectionState;
  tts: ProviderSelectionState;
  ttsSpeed: number;
  aiProfile: AIProfileState;
  audioEnhancement: AudioEnhancementState;
  vocabularyKeybindings: VocabularyKeybindings;

  // Setters
  setActiveProvider: (p: "gemini" | "groq") => void;
  setPreferredGeminiModel: (m: string) => void;
  setPreferredGroqModel: (m: string) => void;
  setAudioEnhancement: (opts: Partial<AudioEnhancementState>) => void;
  setSentenceBuilderGen: (s: ProviderSelectionState) => void;
  setSentenceBuilderEval: (s: ProviderSelectionState) => void;
  setShadowing: (s: ProviderSelectionState) => void;
  setSurvivalSpeaking: (s: ProviderSelectionState) => void;
  setConversation: (s: ProviderSelectionState) => void;
  setEvaluation: (s: ProviderSelectionState) => void;
  setGeneration: (s: ProviderSelectionState) => void;
  setStt: (s: ProviderSelectionState) => void;
  setTts: (s: ProviderSelectionState) => void;
  setTtsSpeed: (speed: number) => void;
  setAIProfile: (p: Partial<AIProfileState>) => void;
  setFeatureModel: (feature: string, selection: ProviderSelectionState) => void;
  applyProviderToAll: (provider: "gemini" | "groq", model?: string) => void;
  setVocabularyKeybinding: (action: keyof VocabularyKeybindings, key: string) => void;
  resetVocabularyKeybindings: () => void;
  setAll: (s: Partial<SettingsState>) => void;
}

const DEFAULTS = {
  activeProvider: "gemini" as const,
  preferredGeminiModel: "gemini-3.5-flash-lite",
  preferredGroqModel: "openai/gpt-oss-120b",
  sentenceBuilderGen: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  sentenceBuilderEval: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  shadowing: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  survivalSpeaking: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  conversation: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  evaluation: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  generation: { provider: "gemini", model: "gemini-3.5-flash-lite" },
  stt: { provider: "browser", model: "browser-stt" },
  tts: { provider: "edge-tts", model: "en-US-JennyNeural" },
  ttsSpeed: 1.0,
  aiProfile: {
    mode: "auto" as const,
    qualityPreference: "balanced" as const,
    latencyPreference: "balanced" as const,
    fallbackEnabled: false,
    contextOptimizationEnabled: true,
    showModelInfo: false,
  },
  audioEnhancement: {
    autoNormalize: true,
    micGain: 1.5,
    noiseFloorGate: true,
  },
  vocabularyKeybindings: {
    playWord: "KeyA",
    playSentence: "KeyS",
    clearSpeech: "KeyZ",
    previousWord: "KeyQ",
    toggleMic: "Space",
    submitOrNext: "Enter",
    toggleHints: "KeyH",
    randomWord: "KeyR",
    step1: "Digit1",
    step2: "Digit2",
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setVocabularyKeybinding: (action, key) =>
        set((state) => ({
          vocabularyKeybindings: {
            ...state.vocabularyKeybindings,
            [action]: key,
          },
        })),
      resetVocabularyKeybindings: () =>
        set({
          vocabularyKeybindings: { ...DEFAULTS.vocabularyKeybindings },
        }),
      setAudioEnhancement: (opts) =>
        set((state) => ({
          audioEnhancement: {
            ...state.audioEnhancement,
            ...opts,
          },
        })),
      setActiveProvider: (p) => {
        const state = get();
        const model = p === "gemini" ? state.preferredGeminiModel : state.preferredGroqModel;
        set({
          activeProvider: p,
          sentenceBuilderGen: { provider: p, model },
          sentenceBuilderEval: { provider: p, model },
          shadowing: { provider: p, model },
          survivalSpeaking: { provider: p, model },
          conversation: { provider: p, model },
          evaluation: { provider: p, model },
          generation: { provider: p, model },
        });
      },
      setPreferredGeminiModel: (m) => set({ preferredGeminiModel: m }),
      setPreferredGroqModel: (m) => set({ preferredGroqModel: m }),
      setSentenceBuilderGen: (s) => set({ sentenceBuilderGen: s }),
      setSentenceBuilderEval: (s) => set({ sentenceBuilderEval: s }),
      setShadowing: (s) => set({ shadowing: s }),
      setSurvivalSpeaking: (s) => set({ survivalSpeaking: s }),
      setConversation: (s) => set({ conversation: s }),
      setEvaluation: (s) => set({ evaluation: s }),
      setGeneration: (s) => set({ generation: s }),
      setStt: (s) => set({ stt: s }),
      setTts: (s) => set({ tts: s }),
      setTtsSpeed: (speed) => set({ ttsSpeed: speed }),
      setAIProfile: (p) => set((state) => ({ aiProfile: { ...state.aiProfile, ...p } })),
      setFeatureModel: (feature, selection) => {
        if (feature === "sentenceBuilder") {
          set({ sentenceBuilderGen: selection, sentenceBuilderEval: selection, generation: selection });
        } else if (feature === "conversation") {
          set({ conversation: selection });
        } else if (feature === "shadowing") {
          set({ shadowing: selection });
        } else if (feature === "survivalSpeaking") {
          set({ survivalSpeaking: selection });
        } else if (feature === "evaluation") {
          set({ evaluation: selection });
        }
      },
      applyProviderToAll: (provider, customModel) => {
        const state = get();
        const model =
          customModel ||
          (provider === "gemini" ? state.preferredGeminiModel : state.preferredGroqModel);
        set({
          activeProvider: provider,
          preferredGeminiModel: provider === "gemini" ? model : state.preferredGeminiModel,
          preferredGroqModel: provider === "groq" ? model : state.preferredGroqModel,
          sentenceBuilderGen: { provider, model },
          sentenceBuilderEval: { provider, model },
          shadowing: { provider, model },
          survivalSpeaking: { provider, model },
          conversation: { provider, model },
          evaluation: { provider, model },
          generation: { provider, model },
        });
      },
      setAll: (s) => set(s),
    }),
    {
      name: "english-speaking-settings",
      version: 6,
      migrate: (persisted, version) => {
        const p = persisted as Partial<SettingsState>;
        return {
          ...DEFAULTS,
          ...p,
          vocabularyKeybindings: {
            ...DEFAULTS.vocabularyKeybindings,
            ...(p.vocabularyKeybindings || {}),
          },
        } as SettingsState;
      },
    }
  )
);
