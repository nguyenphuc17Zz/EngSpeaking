// Provider-independent AI types — Phase 1 Core Voice Engine
export type ProviderId = "gemini" | "groq" | "browser" | "mock" | string;

export interface AIModelCapabilities {
  textGeneration: boolean;
  speechToText: boolean;
  textToSpeech: boolean;
  streaming: boolean;
  structuredOutput: boolean;
}

export interface AIModel {
  id: string;
  providerId: string;
  displayName: string;
  capabilities: AIModelCapabilities;
  speedClass?: "fast" | "balanced" | "quality";
  costClass?: "free" | "low" | "medium" | "high" | "unknown";
  contextWindow?: number;
  active: boolean;
}

export type AIProviderStatus = "configured" | "not_configured" | "error";

export interface ProviderHealth {
  providerId: string;
  configured: boolean;
  status: AIProviderStatus;
  latencyMs?: number;
  errorMessage?: string;
}

// Text generation
export interface TextGenerationInput {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
}

export interface TextGenerationResult {
  text: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
  latencyMs?: number;
}

// Speech to text
export interface TranscriptionInput {
  audio: Blob | ArrayBuffer | Uint8Array;
  mimeType?: string;
  language?: string; // e.g. "en-US"
  model?: string;
}

export interface TranscriptSegment {
  text: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  durationMs?: number;
  language?: string;
  segments?: TranscriptSegment[];
  provider: string;
  model: string;
}

// Text to speech
export interface SpeechSynthesisInput {
  text: string;
  language?: string; // e.g. "en-US"
  voice?: string;
  speed?: number; // 0.5 - 2.0
  model?: string;
}

export interface SpeechSynthesisResult {
  audio: Blob;
  mimeType: string;
  durationMs?: number;
  provider: string;
  model: string;
}

// Task type for resolver
export type AITask = "conversation" | "transcription" | "synthesis";

// Selection config
export interface ProviderSelection {
  provider: string; // "auto" | providerId
  model: string; // "auto" | modelId
}

export interface VoiceEngineConfig {
  conversation: ProviderSelection;
  stt: ProviderSelection;
  tts: ProviderSelection;
}
