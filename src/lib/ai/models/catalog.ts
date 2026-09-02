// Model registry abstraction §7 — add future provider with minimal changes
import type { AIModel } from "@/types/ai";

export const CATALOG: AIModel[] = [
  // Gemini — primary provider §8
  {
    id: "gemini-3.7-flash",
    providerId: "gemini",
    displayName: "Gemini 3.7 Flash",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    contextWindow: 1_048_576,
    active: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    providerId: "gemini",
    displayName: "Gemini 3.5 Flash Lite",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    contextWindow: 1_048_576,
    active: true,
  },
  {
    id: "gemini-3.6-flash",
    providerId: "gemini",
    displayName: "Gemini 3.6 Flash",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    contextWindow: 1_048_576,
    active: true,
  },
  {
    id: "gemini-3.5-flash",
    providerId: "gemini",
    displayName: "Gemini 3.5 Flash",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    contextWindow: 1_048_576,
    active: true,
  },
  // Groq — additional provider §9
  {
    id: "llama-3.3-70b-versatile",
    providerId: "groq",
    displayName: "Llama 3.3 70B Versatile (Groq)",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    contextWindow: 128_000,
    active: true,
  },
  {
    id: "llama-3.1-8b-instant",
    providerId: "groq",
    displayName: "Llama 3.1 8B Instant (Groq)",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    contextWindow: 128_000,
    active: true,
  },
  {
    id: "mixtral-8x7b-32768",
    providerId: "groq",
    displayName: "Mixtral 8x7B 32K (Groq)",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: false },
    speedClass: "balanced",
    costClass: "free",
    contextWindow: 32_768,
    active: true,
  },
  // Groq Whisper STT
  {
    id: "whisper-large-v3",
    providerId: "groq",
    displayName: "Whisper Large v3 (Groq STT)",
    capabilities: { textGeneration: false, speechToText: true, textToSpeech: false, streaming: false, structuredOutput: false },
    speedClass: "balanced",
    costClass: "free",
    active: true,
  },
  {
    id: "whisper-large-v3-turbo",
    providerId: "groq",
    displayName: "Whisper Large v3 Turbo (Groq STT)",
    capabilities: { textGeneration: false, speechToText: true, textToSpeech: false, streaming: false, structuredOutput: false },
    speedClass: "fast",
    costClass: "free",
    active: true,
  },
  // Browser — default per user choice (Web Speech / speechSynthesis)
  {
    id: "browser-stt",
    providerId: "browser",
    displayName: "Browser Web Speech API (STT)",
    capabilities: { textGeneration: false, speechToText: true, textToSpeech: false, streaming: false, structuredOutput: false },
    speedClass: "fast",
    costClass: "free",
    active: true,
  },
  {
    id: "browser-tts",
    providerId: "browser",
    displayName: "Browser Speech Synthesis (TTS)",
    capabilities: { textGeneration: false, speechToText: false, textToSpeech: true, streaming: false, structuredOutput: false },
    speedClass: "fast",
    costClass: "free",
    active: true,
  },
  // Mock — for tests/dev §45
  {
    id: "mock-text",
    providerId: "mock",
    displayName: "Mock Text Model",
    capabilities: { textGeneration: true, speechToText: false, textToSpeech: false, streaming: false, structuredOutput: true },
    speedClass: "fast",
    costClass: "free",
    active: true,
  },
  {
    id: "mock-stt",
    providerId: "mock",
    displayName: "Mock STT",
    capabilities: { textGeneration: false, speechToText: true, textToSpeech: false, streaming: false, structuredOutput: false },
    speedClass: "fast",
    costClass: "free",
    active: true,
  },
  {
    id: "mock-tts",
    providerId: "mock",
    displayName: "Mock TTS",
    capabilities: { textGeneration: false, speechToText: false, textToSpeech: true, streaming: false, structuredOutput: false },
    speedClass: "fast",
    costClass: "free",
    active: true,
  },
];

export function getCatalog(): AIModel[] {
  return CATALOG.filter((m) => m.active);
}

export function getModelsForProvider(providerId: string): AIModel[] {
  return getCatalog().filter((m) => m.providerId === providerId.toLowerCase());
}

export function getModelById(modelId: string): AIModel | undefined {
  return getCatalog().find((m) => m.id.toLowerCase() === modelId.toLowerCase());
}
